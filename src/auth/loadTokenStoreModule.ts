// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { TokenStore, TokenStoreFactory } from './tokenStore.js';

/**
 * Every method `TokenStore` declares. Checked at load time so a store missing
 * one fails at startup with the name of what is missing, rather than midway
 * through an authorization with a `TypeError` from inside a route handler.
 */
const REQUIRED_METHODS = [
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
] as const satisfies readonly (keyof TokenStore)[];

/**
 * A relative or absolute path is resolved against the working directory, not
 * against this file: `import('./store.js')` from here would look inside the
 * installed package, which is never what the operator meant. A bare specifier
 * is passed through so a store published to npm resolves the usual way.
 */
const toImportSpecifier = (specifier: string): string =>
  specifier.startsWith('.') || isAbsolute(specifier)
    ? pathToFileURL(resolve(specifier)).href
    : specifier;

const missingMethods = (value: object): string[] =>
  REQUIRED_METHODS.filter(
    (method) => typeof (value as Record<string, unknown>)[method] !== 'function'
  );

/**
 * Loads the module named by `--token-store-module` and calls its default export
 * to build a store.
 *
 * The module is arbitrary code chosen by whoever starts the server, and runs
 * with the server's privileges — the same trust level as the command line it
 * came from.
 */
export async function loadTokenStoreModule(
  specifier: string
): Promise<TokenStore> {
  const imported: unknown = await import(toImportSpecifier(specifier));

  const factory = (imported as { default?: unknown }).default;
  if (typeof factory !== 'function') {
    throw new Error(
      `Token store module "${specifier}" must default-export a function returning a TokenStore.`
    );
  }

  const store: unknown = await (factory as TokenStoreFactory)();
  if (typeof store !== 'object' || store === null) {
    throw new Error(
      `Token store module "${specifier}" returned ${store === null ? 'null' : typeof store} instead of a TokenStore.`
    );
  }

  const missing = missingMethods(store);
  if (missing.length > 0) {
    throw new Error(
      `Token store from "${specifier}" is missing required method(s): ${missing.join(', ')}.`
    );
  }

  return store as TokenStore;
}
