import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// The module builds the logger at import time, so each case needs a fresh
// module graph with the environment already in place.
const stubEnvironment = (env: Record<string, string | undefined>) => {
  vi.resetModules();
  // `vi.stubEnv` deletes the variable when handed `undefined`.
  for (const [key, value] of Object.entries(env)) {
    vi.stubEnv(key, value);
  }
};

const loadLogger = async (env: Record<string, string | undefined>) => {
  stubEnvironment(env);
  const { logger } = await import('./logger.js');
  return logger;
};

// Same thing, but with pino writing to a file instead of fd 2, so the emitted
// lines can be asserted on and do not land in the test runner's own output.
// Only the destination is swapped: the level still comes from the real pino.
const loadLoggerCapturingOutput = async (
  env: Record<string, string | undefined>
) => {
  stubEnvironment(env);
  const file = path.join(os.tmpdir(), `logger-test-${randomUUID()}.log`);
  // pino's types are `export = pino`, but the runtime namespace still carries
  // it on `default`, so the import has to be typed in that shape.
  const { default: actual } = await vi.importActual<{
    default: typeof import('pino');
  }>('pino');

  vi.doMock('pino', () => {
    const factory = ((options: unknown) =>
      (actual as CallableFunction)(
        options,
        actual.destination({ dest: file, sync: true })
      )) as unknown as typeof actual;
    factory.destination = actual.destination;
    return { default: factory };
  });

  const { logger } = await import('./logger.js');
  return { logger, read: () => fs.readFileSync(file, 'utf8') };
};

describe('logger', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.doUnmock('pino');
  });

  describe('default level', () => {
    it('logs only errors when NODE_ENV is unset, as it treats that as production', async () => {
      const logger = await loadLogger({
        NODE_ENV: undefined,
        LOG_LEVEL: undefined,
      });
      expect(logger.level).toBe('error');
    });

    it('treats NODE_ENV as production regardless of case or padding', async () => {
      const logger = await loadLogger({
        NODE_ENV: '  Production  ',
        LOG_LEVEL: undefined,
      });
      expect(logger.level).toBe('error');
    });

    it('logs debug outside production', async () => {
      const logger = await loadLogger({
        NODE_ENV: 'development',
        LOG_LEVEL: undefined,
      });
      expect(logger.level).toBe('debug');
    });
  });

  describe('LOG_LEVEL', () => {
    it('takes precedence over the production default', async () => {
      const logger = await loadLogger({
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
      });
      expect(logger.level).toBe('info');
    });

    it('can also lower the level outside production', async () => {
      const logger = await loadLogger({
        NODE_ENV: 'development',
        LOG_LEVEL: 'warn',
      });
      expect(logger.level).toBe('warn');
    });

    it('accepts silent', async () => {
      const logger = await loadLogger({
        NODE_ENV: 'production',
        LOG_LEVEL: 'silent',
      });
      expect(logger.level).toBe('silent');
    });

    it('is case-insensitive and tolerates surrounding whitespace', async () => {
      const logger = await loadLogger({
        NODE_ENV: 'production',
        LOG_LEVEL: '  TRACE  ',
      });
      expect(logger.level).toBe('trace');
    });

    it('falls back to the default when empty', async () => {
      const logger = await loadLogger({
        NODE_ENV: 'production',
        LOG_LEVEL: '   ',
      });
      expect(logger.level).toBe('error');
    });

    it('falls back to the default on an unrecognised value instead of throwing', async () => {
      const { logger } = await loadLoggerCapturingOutput({
        NODE_ENV: 'production',
        LOG_LEVEL: 'verbose',
      });
      expect(logger.level).toBe('error');
    });

    it('reports an unrecognised value, at a level the fallback still emits', async () => {
      const { read } = await loadLoggerCapturingOutput({
        NODE_ENV: 'production',
        LOG_LEVEL: 'verbose',
      });

      // The whole point of this message is the operator whose LOG_LEVEL did not
      // take effect, so it has to survive the default level it fell back to.
      const reported = JSON.parse(read().trim()) as Record<string, unknown>;
      expect(reported).toMatchObject({
        level: 50,
        requested: 'verbose',
        effective: 'error',
      });
    });

    it('stays quiet when LOG_LEVEL is recognised', async () => {
      const { read } = await loadLoggerCapturingOutput({
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
      });
      expect(read()).toBe('');
    });
  });
});
