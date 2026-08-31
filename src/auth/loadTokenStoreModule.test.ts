// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadTokenStoreModule } from './loadTokenStoreModule.js';

const METHODS = [
  'storePendingAuth',
  'consumePendingAuth',
  'storeAuthCode',
  'consumeAuthCode',
  'getClient',
  'registerClient',
  'getCachedVerification',
  'cacheVerification',
  'storeMcpToken',
  'getMcpToken',
  'storeMcpRefreshToken',
  'consumeMcpRefreshToken',
  'cleanup',
];

/**
 * Written to a temp directory and imported by absolute path, which is the case
 * that matters: a store lives outside this package, so it cannot be resolved
 * relative to the loader.
 */
const writeModule = (source: string): string => {
  const dir = mkdtempSync(join(tmpdir(), 'token-store-'));
  const file = join(dir, 'store.mjs');
  writeFileSync(file, source);
  return file;
};

const storeSource = (omit: string[] = []): string => {
  const methods = METHODS.filter((m) => !omit.includes(m))
    .map((m) => `  ${m}: async () => undefined,`)
    .join('\n');
  return `export default async () => ({\n${methods}\n});\n`;
};

describe('loadTokenStoreModule', () => {
  it('builds a store from a module default-exporting an async factory', async () => {
    const store = await loadTokenStoreModule(writeModule(storeSource()));

    for (const method of METHODS) {
      expect(typeof (store as Record<string, unknown>)[method]).toBe(
        'function'
      );
    }
  });

  it('rejects a module without a default export', async () => {
    const file = writeModule('export const createStore = () => ({});\n');

    await expect(loadTokenStoreModule(file)).rejects.toThrow(
      /must default-export a function/
    );
  });

  it('rejects a factory that does not return an object', async () => {
    const file = writeModule('export default () => 42;\n');

    await expect(loadTokenStoreModule(file)).rejects.toThrow(
      /returned number instead of a TokenStore/
    );
  });

  it('names the methods an incomplete store is missing', async () => {
    const file = writeModule(storeSource(['getMcpToken', 'cleanup']));

    await expect(loadTokenStoreModule(file)).rejects.toThrow(
      /missing required method\(s\): getMcpToken, cleanup/
    );
  });

  it('reports an unresolvable specifier', async () => {
    await expect(
      loadTokenStoreModule('./definitely-not-a-real-store.mjs')
    ).rejects.toThrow();
  });
});
