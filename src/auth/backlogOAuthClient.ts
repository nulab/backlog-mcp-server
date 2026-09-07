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
