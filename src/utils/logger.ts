import pino from 'pino';

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

// Normalised like LOG_LEVEL: a strict match would let `Production` or stray
// whitespace silently flip both the default level and the output format.
const isProd = process.env.NODE_ENV?.trim().toLowerCase() === 'production';

// Validated up front so a bad LOG_LEVEL falls back to the default (and says so)
// instead of pino throwing during construction.
const LEVELS = [
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'silent',
] as const;

type LogLevel = (typeof LEVELS)[number];

const defaultLevel: LogLevel = isProd ? 'error' : 'debug';

// LOG_LEVEL sets verbosity only; NODE_ENV sets format, so raising the level on
// HTTP must not switch to colorized lines a log collector stores verbatim.
// A blank LOG_LEVEL counts as unset (shells and container runtimes produce it).
const normalisedLevel =
  process.env.LOG_LEVEL?.trim().toLowerCase() || undefined;
const requestedLevel =
  normalisedLevel && (LEVELS as readonly string[]).includes(normalisedLevel)
    ? (normalisedLevel as LogLevel)
    : undefined;
const level: LogLevel = requestedLevel ?? defaultLevel;

// Plain JSON on stderr. stdout carries the JSON-RPC stream on the stdio
// transport, so a log line landing there would corrupt the protocol.
const plainLogger = () =>
  pino({ level }, pino.destination({ dest: 2, sync: false }));

// `pino-pretty` is a dev-only dependency; pino throws synchronously when the
// transport is missing, so fall back to plain logs.
const prettyLogger = () => {
  try {
    return pino({
      level,
      transport: {
        target: 'pino-pretty',
        options: {
          destination: 2,
          colorize: true,
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
          ignore: 'pid,hostname',
          singleLine: true,
        },
      },
    });
  } catch {
    return plainLogger();
  }
};

export const logger = isProd ? plainLogger() : prettyLogger();

if (normalisedLevel && !requestedLevel) {
  // `error`, not `warn`: the default level in force on a deployed server would
  // swallow a warning.
  logger.error(
    { requested: process.env.LOG_LEVEL, effective: level, supported: LEVELS },
    'Unrecognised LOG_LEVEL; falling back to the default level'
  );
}
