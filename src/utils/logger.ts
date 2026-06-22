// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

// A dependency-free, pino-compatible structured logger.
//
// It is intentionally console-based so the same logger works in Node.js
// (stdio / CLI) and in Cloudflare Workers, where pino cannot be bundled
// (pino relies on Node file descriptors and worker threads).
//
// All output is written via `console.error`, which maps to stderr in Node.js.
// This matters for the stdio transport, where stdout is reserved for the MCP
// protocol and any stray log on stdout would corrupt the stream. In Workers,
// `console.error` is captured by the platform log pipeline.

const LEVELS = ['debug', 'info', 'warn', 'error'] as const;
type LogLevel = (typeof LEVELS)[number];

type MergeObject = Record<string, unknown>;

export type Logger = {
  [K in LogLevel]: (mergeObjectOrMessage?: MergeObject | string, message?: string) => void;
};

/**
 * Reads an environment variable across Node.js and Workers.
 *
 * Accessed via `globalThis` so this module needs neither Node nor Workers type
 * globals. In Workers, `process.env` is only populated when `nodejs_compat` is
 * enabled, so this guards against `process` being undefined.
 */
function readEnv(name: string): string | undefined {
  const proc = (
    globalThis as {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process;
  return proc?.env?.[name];
}

/**
 * Resolves the minimum log level to emit.
 *
 * Honours `LOG_LEVEL` when set to a known level; otherwise falls back to the
 * historical behaviour: `error` in production, `debug` elsewhere.
 */
function resolveLevel(): LogLevel {
  const explicit = readEnv('LOG_LEVEL')?.toLowerCase();
  if (explicit && (LEVELS as readonly string[]).includes(explicit)) {
    return explicit as LogLevel;
  }
  const nodeEnv = readEnv('NODE_ENV') ?? 'production';
  return nodeEnv === 'production' ? 'error' : 'debug';
}

/**
 * Serializes an Error into a plain object so it survives JSON.stringify.
 */
function serializeError(err: Error): MergeObject {
  return {
    type: err.name,
    message: err.message,
    stack: err.stack,
  };
}

/**
 * Normalizes a merge object, expanding any `err` Error value into a
 * serializable shape (mirroring pino's standard error serializer).
 */
function normalizeMergeObject(mergeObject: MergeObject): MergeObject {
  if (mergeObject.err instanceof Error) {
    return { ...mergeObject, err: serializeError(mergeObject.err) };
  }
  return mergeObject;
}

/**
 * Builds a logger that emits one JSON line per record to stderr.
 *
 * The call signature mirrors pino: `logger.info({ key: 'value' }, 'message')`
 * or `logger.info('message')`.
 */
export function createLogger(): Logger {
  const minLevel = resolveLevel();
  const minIndex = LEVELS.indexOf(minLevel);

  const log = (
    level: LogLevel,
    mergeObjectOrMessage?: MergeObject | string,
    message?: string
  ): void => {
    if (LEVELS.indexOf(level) < minIndex) return;

    const record: MergeObject = { level, time: new Date().toISOString() };

    if (typeof mergeObjectOrMessage === 'string') {
      record.msg = mergeObjectOrMessage;
    } else if (mergeObjectOrMessage) {
      Object.assign(record, normalizeMergeObject(mergeObjectOrMessage));
      if (message !== undefined) record.msg = message;
    }

    console.error(JSON.stringify(record));
  };

  return {
    debug: (m, msg) => log('debug', m, msg),
    info: (m, msg) => log('info', m, msg),
    warn: (m, msg) => log('warn', m, msg),
    error: (m, msg) => log('error', m, msg),
  };
}

export const logger: Logger = createLogger();
