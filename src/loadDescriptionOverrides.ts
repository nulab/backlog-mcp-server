import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import os from 'os';
import path from 'path';
import { logger } from './utils/logger.js';

// Non-string values are dropped: they would make an invalid `tools/list` payload.
// An unparseable file is reported and ignored; failing would look like "the MCP server
// will not connect" with nothing pointing at the config file.

/** First match wins. The extensionless form is parsed as YAML, which also accepts JSON. */
const SUFFIXES = ['', '.json', '.yaml', '.yml'] as const;

type ReadOutcome =
  | { status: 'found'; config: unknown }
  | { status: 'absent' }
  | { status: 'unreadable'; error: unknown };

// A missing candidate is not a failure (at most one of four exists), but one that fails
// to parse must be told apart so it is reported rather than skipped.
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
      // LOG_LEVEL or NODE_ENV says otherwise, so a warning here would never
      // reach the user this message exists for.
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
