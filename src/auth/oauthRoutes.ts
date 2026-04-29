// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { Hono } from 'hono';
import type { BacklogOAuthConfig } from './backlogOAuthConfig.js';
import {
  buildBacklogAuthorizationUrl,
  exchangeBacklogCode,
  refreshBacklogToken,
} from './backlogOAuthClient.js';
import type { TokenStore, OAuthClientInfo } from './tokenStore.js';
import { logger } from '../utils/logger.js';

const AUTH_CODE_TTL_MS = 10 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const LOCALHOST_HOSTS = ['localhost', '127.0.0.1', '[::1]'];
const SUPPORTED_AUTH_METHODS = ['client_secret_post', 'none'];

function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  const hash = createHash('sha256').update(codeVerifier).digest('base64url');
  return hash === codeChallenge;
}

function oauthError(
  code: string,
  description: string
): { error: string; error_description: string } {
  return { error: code, error_description: description };
}

function isValidRedirectUri(uri: string): boolean {
  try {
    const parsed = new URL(uri);
    if (parsed.protocol === 'https:') return true;
    if (
      parsed.protocol === 'http:' &&
      LOCALHOST_HOSTS.includes(parsed.hostname)
    )
      return true;
    return false;
  } catch {
    return false;
  }
}

export function createOAuthRoutes(
  config: BacklogOAuthConfig,
  store: TokenStore,
  mcpPath: string
): Hono {
  const app = new Hono();
  const { serverBaseUrl } = config;
  const callbackUrl = `${serverBaseUrl}/callback`;
  const resourceUri = `${serverBaseUrl}${mcpPath}`;

  // RFC 8414 — OAuth Authorization Server Metadata
  app.get('/.well-known/oauth-authorization-server', (c) => {
    c.header('Cache-Control', 'public, max-age=3600');
    return c.json({
      issuer: serverBaseUrl,
      authorization_endpoint: `${serverBaseUrl}/authorize`,
      token_endpoint: `${serverBaseUrl}/token`,
      registration_endpoint: `${serverBaseUrl}/register`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
      code_challenge_methods_supported: ['S256'],
    });
  });

  // RFC 9728 — OAuth Protected Resource Metadata
  const prm = mcpPath === '/' ? '' : mcpPath;
  app.get(`/.well-known/oauth-protected-resource${prm}`, (c) => {
    c.header('Cache-Control', 'public, max-age=3600');
    return c.json({
      resource: resourceUri,
      authorization_servers: [serverBaseUrl],
    });
  });

  // Dynamic Client Registration (RFC 7591)
  app.post('/register', async (c) => {
    let body: Record<string, unknown>;
    try {
      body = (await c.req.json()) as Record<string, unknown>;
    } catch {
      return c.json(oauthError('invalid_request', 'Invalid JSON body'), 400);
    }

    const redirectUris = body.redirect_uris;
    if (
      !Array.isArray(redirectUris) ||
      redirectUris.length === 0 ||
      !redirectUris.every((u) => typeof u === 'string')
    ) {
      return c.json(
        oauthError(
          'invalid_client_metadata',
          'redirect_uris must be a non-empty array of strings'
        ),
        400
      );
    }

    for (const uri of redirectUris as string[]) {
      if (!isValidRedirectUri(uri)) {
        return c.json(
          oauthError(
            'invalid_client_metadata',
            `redirect_uri must use https or http://localhost: ${uri}`
          ),
          400
        );
      }
    }

    const authMethod =
      typeof body.token_endpoint_auth_method === 'string'
        ? body.token_endpoint_auth_method
        : 'client_secret_post';

    if (!SUPPORTED_AUTH_METHODS.includes(authMethod)) {
      return c.json(
        oauthError(
          'invalid_client_metadata',
          `Unsupported token_endpoint_auth_method: ${authMethod}. Supported: ${SUPPORTED_AUTH_METHODS.join(', ')}`
        ),
        400
      );
    }

    const clientId = randomUUID();
    const clientSecret =
      authMethod === 'none' ? undefined : randomBytes(32).toString('hex');

    const now = Math.floor(Date.now() / 1000);
    const client: OAuthClientInfo = {
      client_id: clientId,
      client_secret: clientSecret,
      client_id_issued_at: now,
      client_secret_expires_at: 0,
      redirect_uris: redirectUris as string[],
      client_name:
        typeof body.client_name === 'string' ? body.client_name : undefined,
      token_endpoint_auth_method: authMethod,
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
    };

    if (!store.registerClient(client)) {
      return c.json(
        oauthError(
          'server_error',
          'Maximum number of registered clients reached'
        ),
        503
      );
    }
    logger.info({ clientId }, 'Registered new OAuth client');

    return c.json(client, 201);
  });

  // Authorization Endpoint
  app.on(['GET', 'POST'], '/authorize', async (c) => {
    const params =
      c.req.method === 'POST'
        ? ((await c.req.parseBody()) as Record<string, string>)
        : (Object.fromEntries(
            new URL(c.req.url).searchParams.entries()
          ) as Record<string, string>);

    const clientId = params.client_id;
    const redirectUri = params.redirect_uri;
    const responseType = params.response_type;
    const codeChallenge = params.code_challenge;
    const codeChallengeMethod = params.code_challenge_method;
    const scope = params.scope;
    const state = params.state;
    const resource = params.resource;

    // Phase 1: Validate client and redirect_uri (errors returned directly)
    if (!clientId) {
      return c.json(oauthError('invalid_request', 'Missing client_id'), 400);
    }

    const client = store.getClient(clientId);
    if (!client) {
      return c.json(oauthError('invalid_client', 'Unknown client_id'), 400);
    }

    if (!redirectUri) {
      if (client.redirect_uris.length !== 1) {
        return c.json(
          oauthError('invalid_request', 'redirect_uri is required'),
          400
        );
      }
    } else if (!client.redirect_uris.includes(redirectUri)) {
      return c.json(
        oauthError('invalid_request', 'Unregistered redirect_uri'),
        400
      );
    }

    const effectiveRedirectUri = redirectUri ?? client.redirect_uris[0];

    // Phase 2: Validate other params (errors redirected)
    if (responseType !== 'code') {
      const url = new URL(effectiveRedirectUri);
      url.searchParams.set('error', 'unsupported_response_type');
      url.searchParams.set(
        'error_description',
        'Only response_type=code is supported'
      );
      if (state) url.searchParams.set('state', state);
      return c.redirect(url.href, 302);
    }

    if (!codeChallenge) {
      const url = new URL(effectiveRedirectUri);
      url.searchParams.set('error', 'invalid_request');
      url.searchParams.set('error_description', 'code_challenge is required');
      if (state) url.searchParams.set('state', state);
      return c.redirect(url.href, 302);
    }

    if (codeChallengeMethod && codeChallengeMethod !== 'S256') {
      const url = new URL(effectiveRedirectUri);
      url.searchParams.set('error', 'invalid_request');
      url.searchParams.set(
        'error_description',
        'Only code_challenge_method=S256 is supported'
      );
      if (state) url.searchParams.set('state', state);
      return c.redirect(url.href, 302);
    }

    if (resource && resource !== resourceUri) {
      const url = new URL(effectiveRedirectUri);
      url.searchParams.set('error', 'invalid_target');
      url.searchParams.set('error_description', 'Invalid resource parameter');
      if (state) url.searchParams.set('state', state);
      return c.redirect(url.href, 302);
    }

    // Store pending authorization and redirect to Backlog
    const backlogState = randomUUID();
    store.storePendingAuth(backlogState, {
      mcpClientId: clientId,
      codeChallenge,
      redirectUri: effectiveRedirectUri,
      resource: resource ?? resourceUri,
      scopes: scope ? scope.split(' ') : [],
      state,
      createdAt: Date.now(),
    });

    const backlogAuthUrl = buildBacklogAuthorizationUrl(
      config,
      callbackUrl,
      backlogState
    );

    return c.redirect(backlogAuthUrl, 302);
  });

  // Backlog OAuth Callback
  app.get('/callback', async (c) => {
    const url = new URL(c.req.url);
    const backlogCode = url.searchParams.get('code');
    const backlogState = url.searchParams.get('state');
    const backlogError = url.searchParams.get('error');

    if (!backlogState) {
      return c.text('Missing state parameter from Backlog', 400);
    }

    if (backlogError || !backlogCode) {
      const pending = store.consumePendingAuth(backlogState);
      if (!pending) {
        return c.text(
          'Unknown or expired authorization state. Please start the authorization flow again.',
          400
        );
      }
      const errorUrl = new URL(pending.redirectUri);
      errorUrl.searchParams.set('error', backlogError ?? 'access_denied');
      errorUrl.searchParams.set(
        'error_description',
        url.searchParams.get('error_description') ??
          'Authorization was denied by the user'
      );
      if (pending.state) errorUrl.searchParams.set('state', pending.state);
      return c.redirect(errorUrl.href, 302);
    }

    const pending = store.consumePendingAuth(backlogState);
    if (!pending) {
      return c.text(
        'Unknown or expired authorization state. Please start the authorization flow again.',
        400
      );
    }

    let backlogTokens;
    try {
      backlogTokens = await exchangeBacklogCode(
        config,
        backlogCode,
        callbackUrl
      );
    } catch (err) {
      logger.error({ err }, 'Failed to exchange Backlog authorization code');
      const url = new URL(pending.redirectUri);
      url.searchParams.set('error', 'server_error');
      url.searchParams.set(
        'error_description',
        'Failed to exchange authorization code with Backlog'
      );
      if (pending.state) url.searchParams.set('state', pending.state);
      return c.redirect(url.href, 302);
    }

    const mcpCode = randomUUID();
    store.storeAuthCode(mcpCode, {
      mcpClientId: pending.mcpClientId,
      backlogTokens,
      codeChallenge: pending.codeChallenge,
      redirectUri: pending.redirectUri,
      resource: pending.resource,
      expiresAt: Date.now() + AUTH_CODE_TTL_MS,
    });

    const redirectUrl = new URL(pending.redirectUri);
    redirectUrl.searchParams.set('code', mcpCode);
    if (pending.state) redirectUrl.searchParams.set('state', pending.state);

    return c.redirect(redirectUrl.href, 302);
  });

  // Token Endpoint
  app.post('/token', async (c) => {
    c.header('Cache-Control', 'no-store');

    const body = (await c.req.parseBody()) as Record<string, string>;
    const grantType = body.grant_type;
    const clientId = body.client_id;

    if (!clientId) {
      return c.json(oauthError('invalid_request', 'Missing client_id'), 400);
    }

    const client = store.getClient(clientId);
    if (!client) {
      return c.json(oauthError('invalid_client', 'Unknown client_id'), 401);
    }

    if (client.client_secret && body.client_secret !== client.client_secret) {
      return c.json(oauthError('invalid_client', 'Invalid client_secret'), 401);
    }

    if (grantType === 'authorization_code') {
      const code = body.code;
      const codeVerifier = body.code_verifier;
      const redirectUri = body.redirect_uri;
      const resource = body.resource;

      if (!code) {
        return c.json(oauthError('invalid_request', 'Missing code'), 400);
      }

      const entry = store.consumeAuthCode(code);
      if (!entry) {
        return c.json(
          oauthError('invalid_grant', 'Invalid or expired authorization code'),
          400
        );
      }

      if (entry.mcpClientId !== clientId) {
        return c.json(
          oauthError(
            'invalid_grant',
            'Authorization code was issued to a different client'
          ),
          400
        );
      }

      if (!redirectUri || redirectUri !== entry.redirectUri) {
        return c.json(
          oauthError(
            'invalid_grant',
            !redirectUri ? 'Missing redirect_uri' : 'redirect_uri mismatch'
          ),
          400
        );
      }

      if (resource && resource !== entry.resource) {
        return c.json(oauthError('invalid_grant', 'resource mismatch'), 400);
      }

      if (!codeVerifier || !verifyPkce(codeVerifier, entry.codeChallenge)) {
        return c.json(
          oauthError('invalid_grant', 'Invalid code_verifier'),
          400
        );
      }

      const mcpAccessToken = randomBytes(32).toString('hex');
      const mcpRefreshToken = randomBytes(32).toString('hex');

      store.storeMcpToken(mcpAccessToken, {
        backlogAccessToken: entry.backlogTokens.access_token,
        clientId,
        expiresAt: Date.now() + entry.backlogTokens.expires_in * 1000,
      });
      store.storeMcpRefreshToken(mcpRefreshToken, {
        backlogRefreshToken: entry.backlogTokens.refresh_token,
        clientId,
        expiresAt: Date.now() + REFRESH_TOKEN_TTL_MS,
      });

      return c.json({
        access_token: mcpAccessToken,
        token_type: 'bearer',
        expires_in: entry.backlogTokens.expires_in,
        refresh_token: mcpRefreshToken,
      });
    }

    if (grantType === 'refresh_token') {
      const refreshToken = body.refresh_token;
      if (!refreshToken) {
        return c.json(
          oauthError('invalid_request', 'Missing refresh_token'),
          400
        );
      }

      const refreshEntry = store.consumeMcpRefreshToken(refreshToken);
      if (!refreshEntry) {
        return c.json(
          oauthError('invalid_grant', 'Invalid or expired refresh token'),
          400
        );
      }

      if (refreshEntry.clientId !== clientId) {
        return c.json(
          oauthError(
            'invalid_grant',
            'Refresh token was issued to a different client'
          ),
          400
        );
      }

      try {
        const tokens = await refreshBacklogToken(
          config,
          refreshEntry.backlogRefreshToken
        );

        const mcpAccessToken = randomBytes(32).toString('hex');
        const mcpRefreshToken = randomBytes(32).toString('hex');

        store.storeMcpToken(mcpAccessToken, {
          backlogAccessToken: tokens.access_token,
          clientId,
          expiresAt: Date.now() + tokens.expires_in * 1000,
        });
        store.storeMcpRefreshToken(mcpRefreshToken, {
          backlogRefreshToken: tokens.refresh_token,
          clientId,
          expiresAt: Date.now() + REFRESH_TOKEN_TTL_MS,
        });

        return c.json({
          access_token: mcpAccessToken,
          token_type: 'bearer',
          expires_in: tokens.expires_in,
          refresh_token: mcpRefreshToken,
        });
      } catch (err) {
        logger.error({ err }, 'Failed to refresh Backlog token');
        store.storeMcpRefreshToken(refreshToken, refreshEntry);
        return c.json(
          oauthError('server_error', 'Failed to refresh upstream token'),
          503
        );
      }
    }

    return c.json(
      oauthError(
        'unsupported_grant_type',
        `Unsupported grant_type: ${grantType}`
      ),
      400
    );
  });

  return app;
}
