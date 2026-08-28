import pino from 'pino';

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

const isProd = process.env.NODE_ENV === 'production';

// pino's levels plus `silent`. Listed here so an unusable LOG_LEVEL is caught
// while the fallback is still available, rather than by pino throwing during
// construction — a server that refuses to start is a worse answer to a typo in
// an environment variable than one that logs at its default level and says so.
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

// LOG_LEVEL decides how much is logged; NODE_ENV decides how it is formatted.
// The two are independent questions, and conflating them bites on the HTTP
// transport in particular: there the log stream is the only channel an operator
// has, so raising the level to diagnose something must not also switch the
// output to colorized, human-formatted lines that a log collector stores
// verbatim.
// An empty or blank LOG_LEVEL counts as not set: it is what an unset variable
// looks like once it has been through a shell or a container runtime.
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

// `pino-pretty` is a development-only dependency, so an installed copy of this
// package does not have it. pino resolves a transport target eagerly and throws
// synchronously when it cannot, so asking is cheaper than probing the module
// graph — and a dev-mode run without pino-pretty still gets its logs.
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
  // `logger.error`, not `warn`: the level in force here is the default one,
  // which on a deployed server swallows anything lower — and this message
  // exists precisely for the operator whose LOG_LEVEL did not take effect.
  logger.error(
    { requested: process.env.LOG_LEVEL, effective: level, supported: LEVELS },
    'Unrecognised LOG_LEVEL; falling back to the default level'
  );
}
