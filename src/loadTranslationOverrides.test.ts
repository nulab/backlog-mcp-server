import { loadTranslationOverrides } from './loadTranslationOverrides';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('loadTranslationOverrides', () => {
  let searchDir: string;

  beforeEach(() => {
    searchDir = mkdtempSync(path.join(tmpdir(), 'backlog-mcp-rc-'));
  });

  afterEach(() => {
    rmSync(searchDir, { recursive: true, force: true });
  });

  const writeConfig = (name: string, contents: string) =>
    writeFileSync(path.join(searchDir, name), contents, 'utf-8');

  it('returns an empty object when no config file is found', () => {
    expect(loadTranslationOverrides({ searchDir })).toEqual({});
  });

  it('reads a JSON config file', () => {
    writeConfig(
      '.backlog-mcp-serverrc.json',
      JSON.stringify({ HELLO: 'From json' })
    );

    expect(loadTranslationOverrides({ searchDir })).toEqual({
      HELLO: 'From json',
    });
  });

  it('reads a YAML config file', () => {
    writeConfig('.backlog-mcp-serverrc.yaml', 'HELLO: From yaml\n');

    expect(loadTranslationOverrides({ searchDir })).toEqual({
      HELLO: 'From yaml',
    });
  });

  it('returns an empty object when the config file is empty', () => {
    writeConfig('.backlog-mcp-serverrc.json', '');

    expect(loadTranslationOverrides({ searchDir })).toEqual({});
  });

  it('drops values that are not strings', () => {
    writeConfig(
      '.backlog-mcp-serverrc.json',
      JSON.stringify({
        KEPT: 'a string',
        NUMBER: 12345,
        ARRAY: ['a', 'b'],
        OBJECT: { nested: 'value' },
        NULL: null,
        BOOLEAN: true,
      })
    );

    expect(loadTranslationOverrides({ searchDir })).toEqual({
      KEPT: 'a string',
    });
  });

  it('returns an empty object when the config file is not an object', () => {
    writeConfig('.backlog-mcp-serverrc.json', JSON.stringify(['a', 'b']));

    expect(loadTranslationOverrides({ searchDir })).toEqual({});
  });

  it('honours a custom config name', () => {
    writeConfig('.otherrc.json', JSON.stringify({ HELLO: 'From other' }));

    expect(
      loadTranslationOverrides({ searchDir, configName: 'other' })
    ).toEqual({ HELLO: 'From other' });
  });
});
