import { cosmiconfigSync } from 'cosmiconfig';
import os from 'os';
import { logger } from './utils/logger.js';

/**
 * Reads description overrides from a `.backlog-mcp-serverrc` file (`.json`,
 * `.yaml` or `.yml`) in the user's home directory.
 *
 * Node-only, and kept separate from `createDescriptionHelper` for that reason:
 * cosmiconfig walks the filesystem and the default search path is the home
 * directory. The CLI calls this and hands the result to the helper.
 *
 * The file is user-authored, so its contents are unknown: anything that is not a
 * string is dropped here rather than passed on. Most overrides end up in a tool
 * description, and a number or an array there would produce an invalid
 * `tools/list` payload.
 *
 * A file that cannot be parsed is reported and then ignored. Overriding
 * descriptions is an add-on, and a trailing comma in an optional file is not a
 * reason to stop serving the tools — from the client's side an exception here
 * looks like "the MCP server will not connect", with nothing pointing at the
 * config file.
 */
export function loadDescriptionOverrides(options?: {
  configName?: string;
  searchDir?: string;
}): Record<string, string> {
  const explorer = cosmiconfigSync(options?.configName ?? 'backlog-mcp-server');
  const searchPath = options?.searchDir ?? os.homedir();

  let config: unknown;
  try {
    config = explorer.search(searchPath)?.config;
  } catch (error) {
    // `logger.error`, not `warn`: the logger runs at level `error` unless
    // NODE_ENV says otherwise, so a warning here would never reach the user this
    // message exists for.
    logger.error(
      { err: error, searchPath },
      'Could not read the description override file; continuing with the built-in defaults'
    );
    return {};
  }

  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(config).filter(([, value]) => typeof value === 'string')
  );
}
