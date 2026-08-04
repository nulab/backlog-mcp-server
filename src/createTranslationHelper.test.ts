import { createTranslationHelper } from './createTranslationHelper';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('createTranslationHelper', () => {
  beforeEach(() => {
    delete process.env.BACKLOG_MCP_HELLO;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns fallback if no env or override is present', () => {
    const { t } = createTranslationHelper();
    expect(t('HELLO', 'Fallback')).toBe('Fallback');
  });

  it('returns value from overrides if present', () => {
    const { t } = createTranslationHelper({ HELLO: 'From config' });
    expect(t('HELLO', 'Fallback')).toBe('From config');
  });

  it('returns value from environment variable over overrides', () => {
    process.env.BACKLOG_MCP_HELLO = 'From env';

    const { t } = createTranslationHelper({ HELLO: 'From config' });
    expect(t('HELLO', 'Fallback')).toBe('From env');
  });

  it('looks up overrides by the upper-cased key', () => {
    const { t } = createTranslationHelper({ HELLO: 'From config' });
    expect(t('hello', 'Fallback')).toBe('From config');
  });

  it('caches the first call to a key', () => {
    process.env.BACKLOG_MCP_HELLO = 'Cached value';
    const { t } = createTranslationHelper();

    const first = t('HELLO', 'Fallback');
    process.env.BACKLOG_MCP_HELLO = 'Modified value';
    const second = t('HELLO', 'Fallback');

    expect(first).toBe('Cached value');
    expect(second).toBe('Cached value');
  });

  // The tool layer this helper serves is meant to run on non-Node runtimes, where
  // `process` may be missing entirely or shimmed without `env`. Neither case is
  // reachable on Node, so nothing else in the suite exercises these guards.
  it('resolves without a process global', () => {
    vi.stubGlobal('process', undefined);

    const { t } = createTranslationHelper({ HELLO: 'From config' });
    expect(t('HELLO', 'Fallback')).toBe('From config');
    expect(t('MISSING', 'Fallback')).toBe('Fallback');
  });

  it('resolves when the process global has no env', () => {
    vi.stubGlobal('process', {});

    const { t } = createTranslationHelper({ HELLO: 'From config' });
    expect(t('HELLO', 'From config')).toBe('From config');
    expect(t('MISSING', 'Fallback')).toBe('Fallback');
  });

  it('dumps every key resolved so far', () => {
    const { t, dump } = createTranslationHelper({ HELLO: 'From config' });

    t('HELLO', 'Fallback');
    t('GOODBYE', 'Bye');

    expect(dump()).toEqual({ HELLO: 'From config', GOODBYE: 'Bye' });
  });
});
