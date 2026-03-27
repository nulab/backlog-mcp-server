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

export function parseBacklogAPIError(err: unknown): ParsedBacklogAPIError {
  const e = err as MaybeBacklogErrorObject;

  if (e._name && e._status && e._url) {
    const status = e._status;
    const url = e._url;
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
