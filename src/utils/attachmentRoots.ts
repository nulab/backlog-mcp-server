/**
 * The directory allowlist for `add_attachment`, as pure string logic.
 *
 * `add_attachment` is the one tool that reads the host's filesystem, which makes
 * it the one tool that can send a local file somewhere else. The allowlist is
 * how an operator bounds that. The path work itself lives in the tool, where
 * `node:fs` can be reached at call time; what is here is the part that decides,
 * and it is kept free of Node built-ins so `src/lib.ts` stays importable on
 * runtimes that have none.
 *
 * `delimiter` and `sep` are parameters rather than imports for the same reason.
 */

export const ATTACHMENT_ROOTS_ENV = 'BACKLOG_ATTACHMENT_ROOTS';

/**
 * The configured roots, or `undefined` when the variable is unset or empty.
 *
 * `undefined` means "no allowlist", not "no roots": an unset variable leaves
 * `add_attachment` able to read any path the server process can, which is the
 * only behaviour that works out of the box for the stdio/npx setup where the
 * server and the caller share a filesystem. Setting the variable is how that is
 * narrowed. The distinction matters at the call site, so it is carried in the
 * type rather than flattened to an empty array.
 */
export function parseAttachmentRoots(
  value: string | undefined,
  delimiter: string
): string[] | undefined {
  const roots = (value ?? '')
    .split(delimiter)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return roots.length > 0 ? roots : undefined;
}

/**
 * Whether `child` is `root` or sits beneath it.
 *
 * Both are expected to be resolved real paths. The separator is appended before
 * the prefix test so that `/srv/uploads-secret` does not count as being inside
 * `/srv/uploads`, which a bare `startsWith` would allow.
 */
export function isInsideRoot(
  child: string,
  root: string,
  sep: string
): boolean {
  if (child === root) {
    return true;
  }

  const prefix = root.endsWith(sep) ? root : `${root}${sep}`;
  return child.startsWith(prefix);
}
