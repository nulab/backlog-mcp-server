import pino from 'pino';

// Quiet by default: the server runs as a subprocess of an MCP client, and its
// stderr ends up in that client's log. Anything below `error` is noise there
// unless someone is looking for it, and `LOG_LEVEL` is how they ask.
const DEFAULT_LEVEL = 'error';
const LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'];

// pino throws on an unknown level, from deep inside itself and without naming
// the variable that set it. A typo in a launcher's environment is not a reason
// to refuse to start, so it is reported here and the default is used instead.
const resolveLevel = (): string => {
  const configured = process.env.LOG_LEVEL?.trim().toLowerCase();
  if (!configured) return DEFAULT_LEVEL;
  if (LEVELS.includes(configured)) return configured;
  process.stderr.write(
    `Ignoring LOG_LEVEL="${configured}": expected one of ${LEVELS.join(', ')}. Using "${DEFAULT_LEVEL}".\n`
  );
  return DEFAULT_LEVEL;
};

// Plain JSON on stderr. stdout carries the JSON-RPC stream on the stdio
// transport, so a log line landing there would corrupt the protocol.
//
// One knob. The level used to come from NODE_ENV instead, which meant reading
// it — and assigning it a default, in a module import, for a process where
// every other library can see it.
export const logger = pino(
  { level: resolveLevel() },
  pino.destination({ dest: 2, sync: false })
);
