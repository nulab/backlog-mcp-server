// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { AsyncLocalStorage } from 'node:async_hooks';

const accessTokenStorage = new AsyncLocalStorage<string | undefined>();

export function runWithAccessToken<T>(
  token: string | undefined,
  fn: () => Promise<T>
): Promise<T> {
  return accessTokenStorage.run(token, fn);
}

export function getCurrentAccessToken(): string | undefined {
  return accessTokenStorage.getStore();
}
