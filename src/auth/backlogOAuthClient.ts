import type { BacklogOAuthConfig } from './backlogOAuthConfig.js';
import type { BacklogTokenData } from './tokenStore.js';

// `status` is absent when no response arrived (DNS, refused, timeout): the retry case.
// `errorCode` (RFC 6749 §5.2) is the only way to tell `invalid_grant` from `invalid_client`.
export class BacklogTokenError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly errorCode?: string
  ) {
    super(message);
    this.name = 'BacklogTokenError';
  }
}

// Best effort: a proxy or WAF may answer the token endpoint with HTML.
function readOAuthErrorCode(body: string): string | undefined {
  try {
    const parsed: unknown = JSON.parse(body);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'error' in parsed &&
      typeof parsed.error === 'string'
    ) {
      return parsed.error;
    }
  } catch {
    // Not JSON; the status and raw text are already in the message.
  }
  return undefined;
}

// The only failure that should send the client to re-authorize; others may be transient.
// `invalid_client` is excluded: it is server misconfiguration, which re-authorizing cannot fix.
export function isGrantGone(err: unknown): boolean {
  return (
    err instanceof BacklogTokenError &&
    (err.errorCode === 'invalid_grant' ||
      (err.status === 400 && err.errorCode === undefined))
  );
}

// Rejection only, not an outage: treating an outage as a rejection would send every client
// through re-authorization and discard credentials that were still valid.
export function isTokenRejected(err: unknown): boolean {
  return (
    err instanceof BacklogTokenError &&
    (err.status === 401 || err.status === 403)
  );
}

export function buildBacklogAuthorizationUrl(
  config: BacklogOAuthConfig,
  redirectUri: string,
  state: string
): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: redirectUri,
    state,
  });
  return `https://${config.backlogDomain}/OAuth2AccessRequest.action?${params.toString()}`;
}

export async function exchangeBacklogCode(
  config: BacklogOAuthConfig,
  code: string,
  redirectUri: string
): Promise<BacklogTokenData> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: redirectUri,
  });

  const response = await fetch(
    `https://${config.backlogDomain}/api/v2/oauth2/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Backlog token exchange failed (${response.status}): ${text}`
    );
  }

  return await response.json();
}

export async function refreshBacklogToken(
  config: BacklogOAuthConfig,
  refreshToken: string
): Promise<BacklogTokenData> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
  });

  let response: Response;
  try {
    response = await fetch(
      `https://${config.backlogDomain}/api/v2/oauth2/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      }
    );
  } catch (err) {
    throw new BacklogTokenError(
      `Could not reach Backlog to refresh the token: ${String(err)}`
    );
  }

  if (!response.ok) {
    const text = await response.text();
    throw new BacklogTokenError(
      `Backlog token refresh failed (${response.status}): ${text}`,
      response.status,
      readOAuthErrorCode(text)
    );
  }

  return await response.json();
}

export async function verifyBacklogToken(
  domain: string,
  accessToken: string
): Promise<{ id: number; userId: string; name: string }> {
  let response: Response;
  try {
    response = await fetch(`https://${domain}/api/v2/users/myself`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (err) {
    throw new BacklogTokenError(
      `Could not reach Backlog to verify the token: ${String(err)}`
    );
  }

  if (!response.ok) {
    throw new BacklogTokenError(
      `Backlog token verification failed (${response.status})`,
      response.status
    );
  }

  return await response.json();
}
