import {
  getCurrentAccessToken,
  reportBacklogAuthError,
} from '../auth/backlogAuthContext.js';
import { ErrorLike } from '../types/result.js';
import { parseBacklogAPIError } from './parseBacklogAPIError.js';

export const backlogErrorHandler = (err: unknown): ErrorLike => {
  // Compared against `undefined`, not truthiness, to match `reportBacklogAuthError` exactly.
  const authMode = getCurrentAccessToken() !== undefined ? 'oauth' : 'apiKey';
  const parsed = parseBacklogAPIError(err, { authMode });

  // Reported so the transport can invalidate the token and ask the client to
  // re-authenticate, rather than returning tool output the client cannot act on.
  if (parsed.type === 'BacklogAuthError') {
    reportBacklogAuthError();
  }

  return {
    kind: 'error',
    message: parsed.message,
  };
};
