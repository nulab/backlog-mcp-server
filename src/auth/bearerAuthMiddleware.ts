// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import type { MiddlewareHandler } from 'hono';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type { OAuthConfigResolver } from './backlogOAuthConfig.js';
import { verifyBacklogToken } from './backlogOAuthClient.js';
import type { TokenStore } from './tokenStore.js';
import { logger } from '../utils/logger.js';

const CACHE_TTL_MS = 5 * 60 * 1000;

export function createBearerAuthMiddleware(
  store: TokenStore,
  resolver: OAuthConfigResolver,
  mcpPath: string
): MiddlewareHandler {
  const prmPath = mcpPath === '/' ? '' : mcpPath;

  function buildResourceMetadataUrl(host: string | undefined): string {
    const config = host ? resolver.resolve(host) : undefined;
    if (config) {
      return `${config.serverBaseUrl}/.well-known/oauth-protected-resource${prmPath}`;
    }
    const scheme = host?.startsWith('localhost') ? 'http' : 'https';
    return `${scheme}://${host ?? 'unknown'}/.well-known/oauth-protected-resource${prmPath}`;
  }

  return async (c, next) => {
    const host = c.req.header('host');
    const resourceMetadataUrl = buildResourceMetadataUrl(host);
    const authHeader = c.req.header('authorization');

    if (!authHeader) {
      c.header(
        'WWW-Authenticate',
        `Bearer resource_metadata="${resourceMetadataUrl}"`
      );
      return c.json(
        {
          error: 'invalid_token',
          error_description: 'Missing Authorization header',
        },
        401
      );
    }

    const [type, mcpToken] = authHeader.split(' ');
    if (type?.toLowerCase() !== 'bearer' || !mcpToken) {
      c.header(
        'WWW-Authenticate',
        `Bearer error="invalid_token", error_description="Invalid Authorization header format", resource_metadata="${resourceMetadataUrl}"`
      );
      return c.json(
        { error: 'invalid_token', error_description: 'Expected Bearer token' },
        401
      );
    }

    const tokenEntry = store.getMcpToken(mcpToken);
    if (!tokenEntry) {
      c.header(
        'WWW-Authenticate',
        `Bearer error="invalid_token", error_description="Unknown or expired token", resource_metadata="${resourceMetadataUrl}"`
      );
      return c.json(
        {
          error: 'invalid_token',
          error_description: 'Unknown or expired token',
        },
        401
      );
    }

    const hostConfig = host ? resolver.resolve(host) : undefined;
    if (resolver.isMultiSite && !hostConfig) {
      c.header(
        'WWW-Authenticate',
        `Bearer error="invalid_token", error_description="Unknown host", resource_metadata="${resourceMetadataUrl}"`
      );
      return c.json(
        {
          error: 'invalid_token',
          error_description: 'Unknown host',
        },
        401
      );
    }
    if (hostConfig && tokenEntry.backlogDomain !== hostConfig.backlogDomain) {
      c.header(
        'WWW-Authenticate',
        `Bearer error="invalid_token", error_description="Token was issued for a different site", resource_metadata="${resourceMetadataUrl}"`
      );
      return c.json(
        {
          error: 'invalid_token',
          error_description: 'Token was issued for a different site',
        },
        401
      );
    }

    c.set('backlogDomain', tokenEntry.backlogDomain);

    const cached = store.getCachedVerification(mcpToken);
    if (cached) {
      c.set('authInfo', cached);
      await next();
      return;
    }

    try {
      const user = await verifyBacklogToken(
        tokenEntry.backlogDomain,
        tokenEntry.backlogAccessToken
      );
      const authInfo: AuthInfo = {
        token: tokenEntry.backlogAccessToken,
        clientId: String(user.id),
        scopes: [],
        expiresAt: Math.floor(Date.now() / 1000) + CACHE_TTL_MS / 1000,
      };
      store.cacheVerification(mcpToken, authInfo, CACHE_TTL_MS);
      c.set('authInfo', authInfo);
      await next();
    } catch (err) {
      logger.warn({ err }, 'Bearer token verification failed');
      c.header(
        'WWW-Authenticate',
        `Bearer error="invalid_token", error_description="Token verification failed", resource_metadata="${resourceMetadataUrl}"`
      );
      return c.json(
        {
          error: 'invalid_token',
          error_description: 'Token verification failed',
        },
        401
      );
    }
  };
}
