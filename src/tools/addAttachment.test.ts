import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { postSpaceAttachment } from 'backlog-js';
import type { Client } from 'backlog-js';
import { addAttachmentTool } from './addAttachment.js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';
import { ATTACHMENT_ROOTS_ENV } from '../utils/attachmentRoots.js';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  postSpaceAttachment: vi.fn(),
}));

const FILE_CONTENT = 'screenshot bytes';

// A real temp tree rather than a mocked `node:fs`. The parts worth testing here
// are symlink resolution and the containment check, and both are properties of
// the filesystem: a mock that returned whatever the test asked for would assert
// only that the code calls the functions it obviously calls.
describe('addAttachmentTool', () => {
  let root: string;
  let allowed: string;
  let outside: string;
  let insideFile: string;
  let outsideFile: string;

  const mockPostSpaceAttachment = vi.mocked(postSpaceAttachment);
  const mockClient = {} as Client;
  const tool = addAttachmentTool(mockClient, createDescriptionHelper(), {
    attachmentRootsRequired: false,
  });
  const remoteTool = addAttachmentTool(mockClient, createDescriptionHelper());

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'backlog-mcp-attachment-'));
    allowed = join(root, 'allowed');
    outside = join(root, 'outside');
    await mkdir(allowed);
    await mkdir(outside);

    insideFile = join(allowed, 'evidence.png');
    outsideFile = join(outside, 'secret.png');
    await writeFile(insideFile, FILE_CONTENT);
    await writeFile(outsideFile, FILE_CONTENT);
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  beforeEach(() => {
    mockPostSpaceAttachment.mockReset();
    mockPostSpaceAttachment.mockResolvedValue({
      id: 42,
      name: 'evidence.png',
      size: 17,
    } as Awaited<ReturnType<typeof postSpaceAttachment>>);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uploads the file and returns what Backlog reports', async () => {
    const result = await tool.handler({ filePath: insideFile });

    expect(result).toEqual({ id: 42, name: 'evidence.png', size: 17 });
    expect(mockPostSpaceAttachment).toHaveBeenCalledTimes(1);
  });

  it('sends the file under the `file` field, named after the basename', async () => {
    await tool.handler({ filePath: insideFile });

    const form = mockPostSpaceAttachment.mock.calls[0][1];
    const sent = form.get('file');

    expect(sent).toBeInstanceOf(Blob);
    expect((sent as File).name).toBe('evidence.png');
    expect(await (sent as Blob).text()).toBe(FILE_CONTENT);
  });

  it('reports a path it cannot read without saying why', async () => {
    await expect(
      tool.handler({ filePath: join(allowed, 'missing.png') })
    ).rejects.toThrow(/Cannot read file/);
    expect(mockPostSpaceAttachment).not.toHaveBeenCalled();
  });

  it('refuses a directory', async () => {
    await expect(tool.handler({ filePath: allowed })).rejects.toThrow(
      /Not a regular file/
    );
    expect(mockPostSpaceAttachment).not.toHaveBeenCalled();
  });

  it('reads any path when no allowlist is configured', async () => {
    vi.stubEnv(ATTACHMENT_ROOTS_ENV, '');

    await expect(
      tool.handler({ filePath: outsideFile })
    ).resolves.toBeDefined();
  });

  it('refuses every path when roots are required but not configured', async () => {
    vi.stubEnv(ATTACHMENT_ROOTS_ENV, '');

    await expect(remoteTool.handler({ filePath: insideFile })).rejects.toThrow(
      new RegExp(`disabled: set ${ATTACHMENT_ROOTS_ENV}`)
    );
    expect(mockPostSpaceAttachment).not.toHaveBeenCalled();
  });

  it('uploads from a configured root when roots are required', async () => {
    vi.stubEnv(ATTACHMENT_ROOTS_ENV, allowed);

    await expect(
      remoteTool.handler({ filePath: insideFile })
    ).resolves.toBeDefined();
  });

  it('accepts a file inside an allowed root', async () => {
    vi.stubEnv(ATTACHMENT_ROOTS_ENV, allowed);

    await expect(tool.handler({ filePath: insideFile })).resolves.toBeDefined();
  });

  it('refuses a file outside every allowed root', async () => {
    vi.stubEnv(ATTACHMENT_ROOTS_ENV, allowed);

    await expect(tool.handler({ filePath: outsideFile })).rejects.toThrow(
      new RegExp(ATTACHMENT_ROOTS_ENV)
    );
    expect(mockPostSpaceAttachment).not.toHaveBeenCalled();
  });

  it('gives a missing file outside the roots the same error as an existing one', async () => {
    vi.stubEnv(ATTACHMENT_ROOTS_ENV, allowed);

    // If this said "Cannot read file" instead, the difference between the two
    // messages would reveal which paths exist beyond the allowlist.
    await expect(
      tool.handler({ filePath: join(outside, 'does-not-exist.png') })
    ).rejects.toThrow(new RegExp(ATTACHMENT_ROOTS_ENV));
    expect(mockPostSpaceAttachment).not.toHaveBeenCalled();
  });

  it('gives a directory outside the roots the same error as a file', async () => {
    vi.stubEnv(ATTACHMENT_ROOTS_ENV, allowed);

    await expect(tool.handler({ filePath: outside })).rejects.toThrow(
      new RegExp(ATTACHMENT_ROOTS_ENV)
    );
    expect(mockPostSpaceAttachment).not.toHaveBeenCalled();
  });

  it('still reports a missing file inside the roots as unreadable', async () => {
    vi.stubEnv(ATTACHMENT_ROOTS_ENV, allowed);

    await expect(
      tool.handler({ filePath: join(allowed, 'does-not-exist.png') })
    ).rejects.toThrow(/Cannot read file/);
  });

  it('refuses a symlink that sits inside an allowed root but points outside it', async () => {
    const link = join(allowed, 'link-to-secret.png');
    await symlink(outsideFile, link);
    vi.stubEnv(ATTACHMENT_ROOTS_ENV, allowed);

    try {
      await expect(tool.handler({ filePath: link })).rejects.toThrow(
        new RegExp(ATTACHMENT_ROOTS_ENV)
      );
      expect(mockPostSpaceAttachment).not.toHaveBeenCalled();
    } finally {
      await rm(link, { force: true });
    }
  });

  it('keeps working when one configured root does not exist', async () => {
    vi.stubEnv(
      ATTACHMENT_ROOTS_ENV,
      [join(root, 'no-such-dir'), allowed].join(delimiter)
    );

    await expect(tool.handler({ filePath: insideFile })).resolves.toBeDefined();
  });
  it('uploads a symlink under the name the caller used, not the target name', async () => {
    const link = join(allowed, 'as-named-by-caller.png');
    await symlink(insideFile, link);
    vi.stubEnv(ATTACHMENT_ROOTS_ENV, allowed);

    try {
      await tool.handler({ filePath: link });

      const sent = mockPostSpaceAttachment.mock.calls[0][1].get('file') as File;
      expect(sent.name).toBe('as-named-by-caller.png');
      expect(await sent.text()).toBe(FILE_CONTENT);
    } finally {
      await rm(link, { force: true });
    }
  });
});
