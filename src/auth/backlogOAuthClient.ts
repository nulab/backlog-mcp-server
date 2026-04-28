// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import type { BacklogOAuthConfig } from './backlogOAuthConfig.js';
import type { BacklogTokenData } from './tokenStore.js';

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

  return (await response.json()) as BacklogTokenData;
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
      `Backlog token refresh failed (${response.status}): ${text}`
    );
  }

  return (await response.json()) as BacklogTokenData;
}

export async function verifyBacklogToken(
  domain: string,
  accessToken: string
): Promise<{ id: number; userId: string; name: string }> {
  const response = await fetch(
    `https://${domain}/api/v2/users/myself`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error(`Backlog token verification failed (${response.status})`);
  }

  return (await response.json()) as { id: number; userId: string; name: string };
}
