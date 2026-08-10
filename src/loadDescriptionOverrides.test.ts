import { loadDescriptionOverrides } from './loadDescriptionOverrides';
import { logger } from './utils/logger';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('loadDescriptionOverrides', () => {
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
    expect(loadDescriptionOverrides({ searchDir })).toEqual({});
  });

  it('reads a JSON config file', () => {
    writeConfig(
      '.backlog-mcp-serverrc.json',
      JSON.stringify({ HELLO: 'From json' })
    );

    expect(loadDescriptionOverrides({ searchDir })).toEqual({
      HELLO: 'From json',
    });
  });

  it('reads a YAML config file', () => {
    writeConfig('.backlog-mcp-serverrc.yaml', 'HELLO: From yaml\n');

    expect(loadDescriptionOverrides({ searchDir })).toEqual({
      HELLO: 'From yaml',
    });
  });

  it('returns an empty object when the config file is empty', () => {
    writeConfig('.backlog-mcp-serverrc.json', '');

    expect(loadDescriptionOverrides({ searchDir })).toEqual({});
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

    expect(loadDescriptionOverrides({ searchDir })).toEqual({
      KEPT: 'a string',
    });
  });

  it('returns an empty object when the config file is not an object', () => {
    writeConfig('.backlog-mcp-serverrc.json', JSON.stringify(['a', 'b']));

    expect(loadDescriptionOverrides({ searchDir })).toEqual({});
  });

  it('honours a custom config name', () => {
    writeConfig('.otherrc.json', JSON.stringify({ HELLO: 'From other' }));

    expect(
      loadDescriptionOverrides({ searchDir, configName: 'other' })
    ).toEqual({ HELLO: 'From other' });
  });

  describe('when the config file cannot be parsed', () => {
    let errorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('falls back to the defaults instead of throwing', () => {
      writeConfig('.backlog-mcp-serverrc.json', '{ this is not valid json');

      expect(() => loadDescriptionOverrides({ searchDir })).not.toThrow();
      expect(loadDescriptionOverrides({ searchDir })).toEqual({});
    });

    it('reports the failure at a level the default logger emits', () => {
      // The logger runs at level `error` unless NODE_ENV says otherwise, so a
      // warning would be dropped for the users this message is meant for.
      writeConfig('.backlog-mcp-serverrc.yaml', 'HELLO: [unclosed\n');

      loadDescriptionOverrides({ searchDir });

      expect(errorSpy).toHaveBeenCalledOnce();
      expect(errorSpy.mock.calls[0]?.[0]).toMatchObject({
        searchPath: searchDir,
      });
    });
  });
});
