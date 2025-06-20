import { createTranslationHelper } from './createTranslationHelper';
import { writeFileSync, unlinkSync } from 'fs';
import { describe, it, expect, beforeEach } from '@jest/globals';
import path from 'path';

const TEMP_CONFIG_PATH = path.resolve(
  process.cwd(),
  '.backlog-mcp-serverrc.json'
);

describe('createTranslationHelper', () => {
  beforeEach(() => {
    delete process.env.BACKLOG_MCP_HELLO;
    try {
      unlinkSync(TEMP_CONFIG_PATH);
    } catch {
      // noop: cannot do anything
    }
  });

  it('returns fallback if no env or config is present', () => {
    const { t } = createTranslationHelper({ searchDir: process.cwd() });
    expect(t('HELLO', 'Fallback')).toBe('Fallback');
  });

  it('returns value from config file if present', () => {
    writeFileSync(
      TEMP_CONFIG_PATH,
      JSON.stringify({ HELLO: 'From config' }, null, 2),
      'utf-8'
    );

    const { t } = createTranslationHelper({ searchDir: process.cwd() });
    expect(t('HELLO', 'Fallback')).toBe('From config');
  });

  it('returns value from environment variable over config', () => {
    writeFileSync(
      TEMP_CONFIG_PATH,
      JSON.stringify({ HELLO: 'From config' }, null, 2),
      'utf-8'
    );

    process.env.BACKLOG_MCP_HELLO = 'From env';

    const { t } = createTranslationHelper({ searchDir: process.cwd() });
    expect(t('HELLO', 'Fallback')).toBe('From env');
  });

  it('caches the first call to a key', () => {
    process.env.BACKLOG_MCP_HELLO = 'Cached value';
    const { t } = createTranslationHelper({ searchDir: process.cwd() });

    const first = t('HELLO', 'Fallback');
    process.env.BACKLOG_MCP_HELLO = 'Modified value';
    const second = t('HELLO', 'Fallback');

    expect(first).toBe('Cached value');
    expect(second).toBe('Cached value');
  });
});
