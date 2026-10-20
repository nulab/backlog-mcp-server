import { createDescriptionHelper } from './createDescriptionHelper';
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vite-plus/test';

describe('createDescriptionHelper', () => {
  beforeEach(() => {
    delete process.env.BACKLOG_MCP_HELLO;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns fallback if no env or override is present', () => {
    const { t } = createDescriptionHelper();
    expect(t('HELLO', 'Fallback')).toBe('Fallback');
  });

  it('returns value from overrides if present', () => {
    const { t } = createDescriptionHelper({ HELLO: 'From config' });
    expect(t('HELLO', 'Fallback')).toBe('From config');
  });

  it('returns value from environment variable over overrides', () => {
    process.env.BACKLOG_MCP_HELLO = 'From env';

    const { t } = createDescriptionHelper({ HELLO: 'From config' });
    expect(t('HELLO', 'Fallback')).toBe('From env');
  });

  it('looks up overrides by the upper-cased key', () => {
    const { t } = createDescriptionHelper({ HELLO: 'From config' });
    expect(t('hello', 'Fallback')).toBe('From config');
  });

  it('caches the first call to a key', () => {
    process.env.BACKLOG_MCP_HELLO = 'Cached value';
    const { t } = createDescriptionHelper();

    const first = t('HELLO', 'Fallback');
    process.env.BACKLOG_MCP_HELLO = 'Modified value';
    const second = t('HELLO', 'Fallback');

    expect(first).toBe('Cached value');
    expect(second).toBe('Cached value');
  });

  // Non-Node runtimes may lack `process` or shim it without `env`; unreachable elsewhere on Node.
  it('resolves without a process global', () => {
    vi.stubGlobal('process', undefined);

    const { t } = createDescriptionHelper({ HELLO: 'From config' });
    expect(t('HELLO', 'Fallback')).toBe('From config');
    expect(t('MISSING', 'Fallback')).toBe('Fallback');
  });

  it('resolves when the process global has no env', () => {
    vi.stubGlobal('process', {});

    const { t } = createDescriptionHelper({ HELLO: 'From config' });
    expect(t('HELLO', 'From config')).toBe('From config');
    expect(t('MISSING', 'Fallback')).toBe('Fallback');
  });

  it('dumps every key resolved so far', () => {
    const { t, dump } = createDescriptionHelper({ HELLO: 'From config' });

    t('HELLO', 'Fallback');
    t('GOODBYE', 'Bye');

    expect(dump()).toEqual({ HELLO: 'From config', GOODBYE: 'Bye' });
  });
});
