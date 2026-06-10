// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { AsyncLocalStorage } from 'node:async_hooks';

type OAuthContext = {
  accessToken: string;
  backlogDomain: string;
};

const oauthContextStorage = new AsyncLocalStorage<OAuthContext | undefined>();

export function runWithOAuthContext<T>(
  accessToken: string,
  backlogDomain: string,
  fn: () => Promise<T>
): Promise<T> {
  return oauthContextStorage.run({ accessToken, backlogDomain }, fn);
}

export function runWithAccessToken<T>(
  token: string | undefined,
  fn: () => Promise<T>
): Promise<T> {
  if (!token) return oauthContextStorage.run(undefined, fn);
  const existing = oauthContextStorage.getStore();
  return oauthContextStorage.run(
    { accessToken: token, backlogDomain: existing?.backlogDomain ?? '' },
    fn
  );
}

export function getCurrentAccessToken(): string | undefined {
  return oauthContextStorage.getStore()?.accessToken;
}

export function getCurrentBacklogDomain(): string | undefined {
  return oauthContextStorage.getStore()?.backlogDomain;
}
