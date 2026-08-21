import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import os from 'os';
import path from 'path';
import { logger } from './utils/logger.js';

/**
 * Reads description overrides from a `.backlog-mcp-serverrc` file in the user's
 * home directory.
 *
 * Node-only, and kept separate from `createDescriptionHelper` for that reason:
 * this reads the filesystem and needs a home directory. The CLI calls it and
 * hands the result to the helper.
 *
 * The file is user-authored, so its contents are unknown: anything that is not a
 * string is dropped here rather than passed on. Most overrides end up in a tool
 * description, and a number or an array there would produce an invalid
 * `tools/list` payload.
 *
 * A file that exists but cannot be parsed is reported and then ignored.
 * Overriding descriptions is an add-on, and a trailing comma in an optional file
 * is not a reason to stop serving the tools — from the client's side an
 * exception here looks like "the MCP server will not connect", with nothing
 * pointing at the config file.
 */

/**
 * Checked in this order; the first one that exists wins. The extensionless form
 * is parsed as YAML, which also accepts JSON.
 */
const SUFFIXES = ['', '.json', '.yaml', '.yml'] as const;

type ReadOutcome =
  | { status: 'found'; config: unknown }
  | { status: 'absent' }
  | { status: 'unreadable'; error: unknown };

/**
 * A missing candidate is not a failure — there are four of them and at most one
 * exists. A candidate that exists but does not parse is, and has to be
 * distinguished from the missing case so it can be reported rather than skipped.
 */
function readCandidate(filePath: string): ReadOutcome {
  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf-8');
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error.code === 'ENOENT' || error.code === 'ENOTDIR')
    ) {
      return { status: 'absent' };
    }
    return { status: 'unreadable', error };
  }

  try {
    // An empty file is a config file with nothing in it, not a parse failure.
    // `JSON.parse('')` throws, so it never reaches the caller's object check.
    if (raw.trim() === '') return { status: 'found', config: undefined };
    return {
      status: 'found',
      config: filePath.endsWith('.json') ? JSON.parse(raw) : load(raw),
    };
  } catch (error) {
    return { status: 'unreadable', error };
  }
}

export function loadDescriptionOverrides(options?: {
  configName?: string;
  searchDir?: string;
}): Record<string, string> {
  const configName = options?.configName ?? 'backlog-mcp-server';
  const searchDir = options?.searchDir ?? os.homedir();

  for (const suffix of SUFFIXES) {
    const filePath = path.join(searchDir, `.${configName}rc${suffix}`);
    const outcome = readCandidate(filePath);

    if (outcome.status === 'absent') continue;

    if (outcome.status === 'unreadable') {
      // `logger.error`, not `warn`: the logger runs at level `error` unless
      // LOG_LEVEL says otherwise, so a warning here would never reach the user
      // this message exists for.
      logger.error(
        { err: outcome.error, filePath },
        'Could not read the description override file; continuing with the built-in defaults'
      );
      return {};
    }

    const config = outcome.config;
    if (
      typeof config !== 'object' ||
      config === null ||
      Array.isArray(config)
    ) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(config).filter(([, value]) => typeof value === 'string')
    );
  }

  return {};
}
