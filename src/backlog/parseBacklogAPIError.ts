/**
 * Converts a BacklogError (or unknown error) into Output format for MCP response
 */
type MaybeBacklogErrorObject = {
  _name?: string;
  _status?: number;
  _url?: string;
  _body?: {
    errors?: {
      message?: string;
      code?: number;
      moreInfo?: string;
    }[];
  };
};

export type ParsedBacklogAPIError = {
  type:
    | 'BacklogAuthError'
    | 'BacklogApiError'
    | 'UnexpectedError'
    | 'UnknownError';
  message: string;
  status?: number;
  code?: number;
  url?: string;
};

/**
 * Query parameters whose value is a credential rather than a request detail.
 *
 * `backlog-js` authenticates an API key by putting it in the query string
 * (`Request.request`: `const query = apiKey ? { apiKey } : {}`), and
 * `BacklogError._url` is `response.url`, so the key is present verbatim on
 * every error raised in API-key mode. The others are here because a URL that
 * reaches this function is not necessarily one this client built.
 */
const CREDENTIAL_PARAMS = new Set([
  'apikey',
  'access_token',
  'accesstoken',
  'refresh_token',
  'password',
  'secret',
  'token',
]);

/**
 * Removes credentials from a URL before it is put in a message a client sees.
 *
 * Tool output is not a private channel: it reaches the model, the client's
 * transcript and whatever logs either keeps. An unparseable URL is reported as
 * absent rather than passed through, because there is no way to tell what it
 * contains.
 */
function redactUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return '[unparseable URL redacted]';
  }

  let redacted = false;
  for (const key of [...url.searchParams.keys()]) {
    if (CREDENTIAL_PARAMS.has(key.toLowerCase())) {
      url.searchParams.set(key, '[REDACTED]');
      redacted = true;
    }
  }

  // `searchParams.set` percent-encodes the brackets Backlog's own filter
  // parameters use, so the string is only rebuilt when something changed.
  return redacted ? url.toString() : rawUrl;
}

export function parseBacklogAPIError(err: unknown): ParsedBacklogAPIError {
  const e = err as MaybeBacklogErrorObject;

  if (e._name && e._status && e._url) {
    const status = e._status;
    const url = redactUrl(e._url);
    const code = e._body?.errors?.[0]?.code;
    const message =
      e._body?.errors?.[0]?.message ?? 'An unknown error occurred.';

    if (e._name === 'BacklogAuthError') {
      return {
        type: 'BacklogAuthError',
        message: `Authentication failed (HTTP ${status}). Please check your API key or permissions.`,
        status,
        url,
      };
    }

    if (e._name === 'BacklogApiError') {
      return {
        type: 'BacklogApiError',
        message: `Backlog API error (code: ${code}, status: ${status})\n${message}`,
        status,
        code,
        url,
      };
    }

    if (e._name === 'UnexpectedError') {
      return {
        type: 'UnexpectedError',
        message: `Unexpected error (HTTP ${status}) while accessing ${url}.`,
        status,
        url,
      };
    }
  }

  return {
    type: 'UnknownError',
    message: (err as Error)?.message ?? 'An unknown error occurred.',
  };
}
