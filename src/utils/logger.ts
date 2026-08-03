import pino from 'pino';

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

const isProd = process.env.NODE_ENV === 'production';

// Plain JSON on stderr. stdout carries the JSON-RPC stream on the stdio
// transport, so a log line landing there would corrupt the protocol.
const plainLogger = () =>
  pino(
    { level: isProd ? 'error' : 'debug' },
    pino.destination({ dest: 2, sync: false })
  );

// `pino-pretty` is a development-only dependency, so an installed copy of this
// package does not have it. pino resolves a transport target eagerly and throws
// synchronously when it cannot, so asking is cheaper than probing the module
// graph — and a dev-mode run without pino-pretty still gets its logs.
const prettyLogger = () => {
  try {
    return pino({
      level: 'debug',
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
