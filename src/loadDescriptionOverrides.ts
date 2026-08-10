import { cosmiconfigSync } from 'cosmiconfig';
import os from 'os';

/**
 * Reads description overrides from a `.backlog-mcp-serverrc` file (`.json`,
 * `.yaml` or `.yml`) in the user's home directory.
 *
 * Node-only, and kept separate from `createDescriptionHelper` for that reason:
 * cosmiconfig walks the filesystem and the default search path is the home
 * directory. The CLI calls this and hands the result to the helper.
 *
 * The file is user-authored, so its contents are unknown: anything that is not a
 * string is dropped here rather than passed on. Every override ends up in a tool
 * description, and a number or an array there would produce an invalid
 * `tools/list` payload.
 */
export function loadDescriptionOverrides(options?: {
  configName?: string;
  searchDir?: string;
}): Record<string, string> {
  const explorer = cosmiconfigSync(options?.configName ?? 'backlog-mcp-server');
  const searchPath = options?.searchDir ?? os.homedir();

  const config: unknown = explorer.search(searchPath)?.config;
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(config).filter(([, value]) => typeof value === 'string')
  );
}
