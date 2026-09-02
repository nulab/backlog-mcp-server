// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { AsyncLocalStorage } from 'node:async_hooks';

type BacklogAuthContext = {
  // Not optional: a context exists only for a request the bearer middleware
  // already resolved a stored token for. Keeping it non-nullable is what makes
  // "a context is present" and "a token is present" the same question, so the
  // wording of an auth failure and the decision to revoke cannot disagree.
  accessToken: string;
  onAuthError?: () => void;
  authErrorReported: boolean;
};

const authContextStorage = new AsyncLocalStorage<BacklogAuthContext>();

/**
 * Runs `fn` with the OAuth access token of the current request in scope.
 *
 * `onAuthError` is invoked the first time a Backlog call inside `fn` is
 * rejected with an authentication error. It runs at the moment of detection
 * rather than after `fn` settles, because a response that has already upgraded
 * to SSE resolves before its handler finishes — the caller cannot rely on
 * inspecting the outcome afterwards to invalidate anything.
 */
export function runWithAccessToken<T>(
  token: string,
  fn: () => Promise<T>,
  onAuthError?: () => void
): Promise<T> {
  return authContextStorage.run(
    { accessToken: token, onAuthError, authErrorReported: false },
    fn
  );
}

export function getCurrentAccessToken(): string | undefined {
  return authContextStorage.getStore()?.accessToken;
}

/**
 * Reports that Backlog rejected the credentials of the current request.
 *
 * A no-op outside {@link runWithAccessToken}, which is how API-key mode stays
 * unaffected: nothing establishes this context on the stdio transport.
 */
export function reportBacklogAuthError(): void {
  const context = authContextStorage.getStore();
  if (!context || context.authErrorReported) return;
  context.authErrorReported = true;
  context.onAuthError?.();
}

/** Whether {@link reportBacklogAuthError} was called in the current context. */
export function hasBacklogAuthErrorBeenReported(): boolean {
  return authContextStorage.getStore()?.authErrorReported ?? false;
}
