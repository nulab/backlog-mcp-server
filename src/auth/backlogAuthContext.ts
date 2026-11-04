import { AsyncLocalStorage } from 'node:async_hooks';

type BacklogAuthContext = {
  // Non-nullable so "context present" and "token present" are the same check;
  // otherwise the auth-failure wording and the revoke decision could disagree.
  accessToken: string;
  onAuthError?: () => void;
  authErrorReported: boolean;
};

const authContextStorage = new AsyncLocalStorage<BacklogAuthContext>();

// `onAuthError` fires on detection, not after `fn` settles: a response upgraded
// to SSE resolves before its handler finishes.
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

// No-op outside runWithAccessToken, which keeps API-key (stdio) mode unaffected.
export function reportBacklogAuthError(): void {
  const context = authContextStorage.getStore();
  if (!context || context.authErrorReported) return;
  context.authErrorReported = true;
  context.onAuthError?.();
}

export function hasBacklogAuthErrorBeenReported(): boolean {
  return authContextStorage.getStore()?.authErrorReported ?? false;
}
