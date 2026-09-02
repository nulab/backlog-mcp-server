import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import {
  ATTACHMENT_ROOTS_ENV,
  isInsideRoot,
  parseAttachmentRoots,
} from '../utils/attachmentRoots.js';

const addAttachmentSchema = buildToolSchema((t) => ({
  filePath: z
    .string()
    .min(1)
    .describe(
      t(
        'TOOL_ADD_ATTACHMENT_FILE_PATH',
        "Path to the file to upload, read on the machine running this server. A relative path resolves against that machine's working directory, so an absolute path is usually what you want. When the server runs in a container, the file has to be bind-mounted into it first."
      )
    ),
}));

/**
 * The Node built-ins this tool needs, loaded at call time.
 *
 * `src/lib.ts` re-exports `allTools`, and its contract is that nothing
 * reachable from there touches a Node built-in on import — the tool layer is
 * meant to be hostable on other runtimes. A static `import 'node:fs'` here would
 * break that for every consumer, including the ones that never call this tool.
 *
 * Deferring it keeps the import graph clean and moves the failure to the only
 * place it means anything: a runtime without `node:fs` cannot serve a local file
 * path in the first place, so a caller that reaches this line was going to fail
 * regardless, and now does so with its own error rather than at startup.
 */
async function loadFileSystem() {
  const [fs, fsPromises, path] = await Promise.all([
    import('node:fs'),
    import('node:fs/promises'),
    import('node:path'),
  ]);
  return { fs, fsPromises, path };
}

/**
 * The configured roots in both the form they were written and their resolved
 * form, or `undefined` when there is no allowlist.
 *
 * Both forms are kept because the two sides of the containment test arrive in
 * different forms. A real path is compared against real roots; the path as the
 * caller wrote it, which is all there is when it does not resolve, is compared
 * against the roots as the operator wrote them. A root that does not resolve
 * keeps only its written form: one bad entry in the variable should not take
 * the working ones down with it, and dropping it can only ever refuse an
 * upload, never permit one.
 */
async function loadAllowedRoots({
  fsPromises,
  path,
}: Awaited<ReturnType<typeof loadFileSystem>>): Promise<string[] | undefined> {
  const env = typeof process === 'undefined' ? undefined : process.env;
  const roots = parseAttachmentRoots(
    env?.[ATTACHMENT_ROOTS_ENV],
    path.delimiter
  );
  if (roots === undefined) {
    return undefined;
  }

  const forms = await Promise.all(
    roots.map(async (root) => {
      const written = path.resolve(root);
      try {
        return [written, await fsPromises.realpath(written)];
      } catch {
        return [written];
      }
    })
  );
  return forms.flat();
}

/**
 * The real path of the file to upload, once it is known to be inside the
 * allowlist when one is configured, readable, and a regular file.
 *
 * Symlinks are resolved before the containment test, not after: a link sitting
 * inside an allowed root can point anywhere, so checking the path as given would
 * approve the link and upload the target.
 *
 * The containment test comes before every other check, and a path outside the
 * allowlist gets the same error whether it exists, is a directory, or is
 * nothing at all. Ordered the other way, the three messages together would let
 * a caller map the filesystem beyond the directories it was confined to, one
 * path per call, which is the thing the allowlist exists to prevent.
 */
async function resolveUploadPath(
  filePath: string,
  nodeApis: Awaited<ReturnType<typeof loadFileSystem>>
): Promise<string> {
  const { fsPromises, path } = nodeApis;
  const allowedRoots = await loadAllowedRoots(nodeApis);
  const isAllowed = (candidate: string) =>
    allowedRoots === undefined ||
    allowedRoots.some((root) => isInsideRoot(candidate, root, path.sep));
  const outside = () =>
    new Error(
      `${filePath} is outside every directory listed in ${ATTACHMENT_ROOTS_ENV}.`
    );

  const requested = path.resolve(filePath);
  let realPath: string;
  try {
    realPath = await fsPromises.realpath(requested);
  } catch {
    if (!isAllowed(requested)) {
      throw outside();
    }
    // Deliberately not the underlying errno message: a missing file and an
    // unreadable parent directory both land here, and the distinction says
    // which of the two it was.
    throw new Error(`Cannot read file: ${filePath}`);
  }

  if (!isAllowed(realPath)) {
    throw outside();
  }

  const stats = await fsPromises.stat(realPath);
  if (!stats.isFile()) {
    throw new Error(`Not a regular file: ${filePath}`);
  }

  return realPath;
}

export const addAttachmentTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof addAttachmentSchema>,
  Entity.File.FileInfo
> => {
  return {
    name: 'add_attachment',
    description: t(
      'TOOL_ADD_ATTACHMENT_DESCRIPTION',
      'Uploads a file and returns its attachment id, name and size. Pass the id in the `attachmentId` array of add_issue, update_issue or add_issue_comment to attach the file — those tools accept ids, they do not upload.'
    ),
    schema: z.object(addAttachmentSchema(t)),
    returnsList: false,
    outputFields: outputFields<Entity.File.FileInfo>()(['id', 'name', 'size']),
    handler: async ({ filePath }) => {
      const nodeApis = await loadFileSystem();
      const realPath = await resolveUploadPath(filePath, nodeApis);

      // `openAsBlob` rather than `readFile`: the Blob is backed by the file, so
      // an attachment near the space's per-file limit is streamed into the
      // request instead of being held in memory in full, then held again as a
      // copy inside FormData.
      const blob = await nodeApis.fs.openAsBlob(realPath);
      const form = new FormData();
      form.append('file', blob, nodeApis.path.basename(realPath));

      return backlog.postSpaceAttachment(form);
    },
  };
};
