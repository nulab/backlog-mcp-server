// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import type { BacklogOAuthConfig } from './backlogOAuthConfig.js';
import type { BacklogTokenData } from './tokenStore.js';

/**
 * A failed Backlog token call, carrying what the caller needs to decide what to
 * tell the client.
 *
 * Whether Backlog rejected the credential or could not be reached decides
 * whether the client should authorize again or back off and retry. Folded into
 * a message string the two are the same exception, and the caller is left
 * parsing prose to tell them apart.
 *
 * `status` is absent when the request never produced a response — DNS failure,
 * refused connection, timeout — which is unambiguously the retry case, so "no
 * status" reads as "not a rejection" without having to guess.
 *
 * `errorCode` is the OAuth error code from the response body, which is where
 * RFC 6749 §5.2 puts the reason. It is the more precise of the two: the status
 * alone cannot separate `invalid_grant` from `invalid_client`, and those ask
 * the caller for opposite behaviour. Absent when the body is not an OAuth error
 * object, which is every response outside the token endpoint.
 */
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

/**
 * The `error` field of an RFC 6749 §5.2 error response, if the body is one.
 *
 * Best effort by design: a proxy or a WAF can answer the token endpoint with
 * HTML, and a body that is not an OAuth error object simply carries no code.
 */
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
    // Not JSON. Nothing to read, and nothing worth reporting either: the
    // status and the raw text are already in the message.
  }
  return undefined;
}

/**
 * Whether the failure is Backlog stating the grant is gone.
 *
 * The one answer that means the client should stop retrying and start a fresh
 * authorization. Everything else leaves the grant's fate unknown, and a client
 * told to re-authorize on a transient failure throws away a grant that was
 * still alive.
 *
 * Read from `errorCode` rather than inferred from the status, because the
 * status cannot separate the two rejections a token endpoint makes:
 * `invalid_client` rejects the *server's* own credentials, which is the
 * operator's misconfiguration and not the client's grant — re-authorizing would
 * fail at the same wall. A bare 400 with no readable code is still a dead
 * grant: that is what the status means on this endpoint when nothing more
 * specific is said.
 */
export function isGrantGone(err: unknown): boolean {
  return (
    err instanceof BacklogTokenError &&
    (err.errorCode === 'invalid_grant' ||
      (err.status === 400 && err.errorCode === undefined))
  );
}

/**
 * Whether Backlog rejected the credential, as opposed to failing to answer.
 *
 * Only a rejection means the caller should authenticate again. An outage
 * treated as a rejection sends every connected client through the whole
 * authorization flow, and the credential that flow produces fails the same way
 * — after the client has already lost the one it had.
 */
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
