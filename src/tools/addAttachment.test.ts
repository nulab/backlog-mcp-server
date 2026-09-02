import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { Backlog } from 'backlog-js';
import { addAttachmentTool } from './addAttachment.js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';
import { ATTACHMENT_ROOTS_ENV } from '../utils/attachmentRoots.js';

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

  const postSpaceAttachment = vi
    .fn<(form: FormData) => Promise<any>>()
    .mockResolvedValue({ id: 42, name: 'evidence.png', size: 17 });

  const mockBacklog: Partial<Backlog> = { postSpaceAttachment };
  const tool = addAttachmentTool(
    mockBacklog as Backlog,
    createDescriptionHelper()
  );

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

  afterEach(() => {
    vi.unstubAllEnvs();
    postSpaceAttachment.mockClear();
  });

  it('uploads the file and returns what Backlog reports', async () => {
    const result = await tool.handler({ filePath: insideFile });

    expect(result).toEqual({ id: 42, name: 'evidence.png', size: 17 });
    expect(postSpaceAttachment).toHaveBeenCalledTimes(1);
  });

  it('sends the file under the `file` field, named after the basename', async () => {
    await tool.handler({ filePath: insideFile });

    const form = postSpaceAttachment.mock.calls[0][0];
    const sent = form.get('file');

    expect(sent).toBeInstanceOf(Blob);
    expect((sent as File).name).toBe('evidence.png');
    expect(await (sent as Blob).text()).toBe(FILE_CONTENT);
  });

  it('reports a path it cannot read without saying why', async () => {
    await expect(
      tool.handler({ filePath: join(allowed, 'missing.png') })
    ).rejects.toThrow(/Cannot read file/);
    expect(postSpaceAttachment).not.toHaveBeenCalled();
  });

  it('refuses a directory', async () => {
    await expect(tool.handler({ filePath: allowed })).rejects.toThrow(
      /Not a regular file/
    );
    expect(postSpaceAttachment).not.toHaveBeenCalled();
  });

  it('reads any path when no allowlist is configured', async () => {
    vi.stubEnv(ATTACHMENT_ROOTS_ENV, '');

    await expect(
      tool.handler({ filePath: outsideFile })
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
    expect(postSpaceAttachment).not.toHaveBeenCalled();
  });

  it('gives a missing file outside the roots the same error as an existing one', async () => {
    vi.stubEnv(ATTACHMENT_ROOTS_ENV, allowed);

    // If this said "Cannot read file" instead, the difference between the two
    // messages would reveal which paths exist beyond the allowlist.
    await expect(
      tool.handler({ filePath: join(outside, 'does-not-exist.png') })
    ).rejects.toThrow(new RegExp(ATTACHMENT_ROOTS_ENV));
    expect(postSpaceAttachment).not.toHaveBeenCalled();
  });

  it('gives a directory outside the roots the same error as a file', async () => {
    vi.stubEnv(ATTACHMENT_ROOTS_ENV, allowed);

    await expect(tool.handler({ filePath: outside })).rejects.toThrow(
      new RegExp(ATTACHMENT_ROOTS_ENV)
    );
    expect(postSpaceAttachment).not.toHaveBeenCalled();
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
      expect(postSpaceAttachment).not.toHaveBeenCalled();
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
});
