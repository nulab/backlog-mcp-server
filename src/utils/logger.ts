import pino from 'pino';

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

const isProd = process.env.NODE_ENV === 'production';

// Plain JSON on stderr. stdout carries the JSON-RPC stream on the stdio
// transport, so a log line landing there would corrupt the protocol.
//
// One shape in every environment. The pretty variant this used to build was
// only reachable by setting NODE_ENV away from production — which `pnpm dev`
// does not do, so nothing produced it by default — and it arrived through a
// pino transport: a worker thread whose buffered lines are lost when the
// process exits promptly. Formatting after the fact has neither drawback:
//
//   pnpm dev 2> >(npx pino-pretty)
export const logger = pino(
  { level: isProd ? 'error' : 'debug' },
  pino.destination({ dest: 2, sync: false })
);
