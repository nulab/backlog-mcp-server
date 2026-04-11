import pino from 'pino';

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

const isProd = process.env.NODE_ENV === 'production';

export const logger = pino(
  {
    level: isProd ? 'error' : 'debug',
    transport: isProd
      ? undefined
      : {
          target: 'pino-pretty',
          options: {
            destination: 2,
            colorize: true,
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
            ignore: 'pid,hostname',
            singleLine: true,
          },
        },
  },
  isProd ? pino.destination({ dest: 2, sync: false }) : undefined
);
