import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// The module builds the logger at import time, so each case needs a fresh
// module graph with the environment already in place.
const loadLogger = async (env: Record<string, string | undefined>) => {
  vi.resetModules();
  // `vi.stubEnv` deletes the variable when handed `undefined`.
  for (const [key, value] of Object.entries(env)) {
    vi.stubEnv(key, value);
  }
  const { logger } = await import('./logger.js');
  return logger;
};

describe('logger', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('default level', () => {
    it('logs only errors when NODE_ENV is unset, as it treats that as production', async () => {
      const logger = await loadLogger({
        NODE_ENV: undefined,
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
      const logger = await loadLogger({
        NODE_ENV: 'production',
        LOG_LEVEL: 'verbose',
      });
      expect(logger.level).toBe('error');
    });
  });
});
