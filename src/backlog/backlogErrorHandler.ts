import {
  getCurrentAccessToken,
  reportBacklogAuthError,
} from '../auth/backlogAuthContext.js';
import { ErrorLike } from '../types/result.js';
import { parseBacklogAPIError } from './parseBacklogAPIError.js';

export const backlogErrorHandler = (err: unknown): ErrorLike => {
  // Only an OAuth request carries an access token in its context; the stdio
  // transport authenticates with an API key and never establishes one. The
  // comparison is against `undefined` rather than truthiness so this asks
  // exactly what `reportBacklogAuthError` asks — whether a context exists —
  // and the two cannot answer differently for the same request.
  const authMode = getCurrentAccessToken() !== undefined ? 'oauth' : 'apiKey';
  const parsed = parseBacklogAPIError(err, { authMode });

  // Backlog rejecting an OAuth token is authoritative: the credential this
  // request was issued is spent. Reporting it lets the transport invalidate the
  // token and tell the client to re-authenticate, instead of returning the
  // failure as tool output the client cannot act on.
  if (parsed.type === 'BacklogAuthError') {
    reportBacklogAuthError();
  }

  return {
    kind: 'error',
    message: parsed.message,
  };
};
