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
 * Query parameter names that carry a credential. Compared case-insensitively.
 */
const CREDENTIAL_QUERY_PARAMS = new Set([
  'apikey',
  'api_key',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'token',
  'client_secret',
  'password',
]);

const REDACTED = 'REDACTED';

/**
 * Replaces the value of any credential-bearing query parameter, keeping the
 * rest of the URL so the message still says which endpoint failed.
 *
 * Returns undefined for a URL that cannot be parsed: there is no way to tell
 * what such a string holds, so it is withheld rather than passed through.
 */
export function redactCredentialsInUrl(url: string): string | undefined {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }

  for (const name of [...parsed.searchParams.keys()]) {
    if (CREDENTIAL_QUERY_PARAMS.has(name.toLowerCase())) {
      parsed.searchParams.set(name, REDACTED);
    }
  }

  return parsed.toString();
}

export function parseBacklogAPIError(err: unknown): ParsedBacklogAPIError {
  const e = err as MaybeBacklogErrorObject;

  if (e._name && e._status && e._url) {
    const status = e._status;
    const url = redactCredentialsInUrl(e._url);
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
        message: url
          ? `Unexpected error (HTTP ${status}) while accessing ${url}.`
          : `Unexpected error (HTTP ${status}).`,
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
