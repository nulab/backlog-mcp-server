// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import type { MiddlewareHandler } from 'hono';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type { BacklogOAuthConfig } from './backlogOAuthConfig.js';
import { verifyBacklogToken } from './backlogOAuthClient.js';
import type { TokenStore } from './tokenStore.js';
import { logger } from '../utils/logger.js';

const CACHE_TTL_MS = 5 * 60 * 1000;

export function createBearerAuthMiddleware(
  store: TokenStore,
  config: BacklogOAuthConfig,
  mcpPath: string
): MiddlewareHandler {
  const prmPath = mcpPath === '/' ? '' : mcpPath;
  const resourceMetadataUrl = `${config.serverBaseUrl}/.well-known/oauth-protected-resource${prmPath}`;

  return async (c, next) => {
    const authHeader = c.req.header('authorization');

    if (!authHeader) {
      c.header(
        'WWW-Authenticate',
        `Bearer resource_metadata="${resourceMetadataUrl}"`
      );
      return c.json({ error: 'invalid_token', error_description: 'Missing Authorization header' }, 401);
    }

    const [type, token] = authHeader.split(' ');
    if (type?.toLowerCase() !== 'bearer' || !token) {
      c.header(
        'WWW-Authenticate',
        `Bearer error="invalid_token", error_description="Invalid Authorization header format", resource_metadata="${resourceMetadataUrl}"`
      );
      return c.json({ error: 'invalid_token', error_description: 'Expected Bearer token' }, 401);
    }

    const cached = store.getCachedVerification(token);
    if (cached) {
      c.set('authInfo', cached);
      await next();
      return;
    }

    try {
      const user = await verifyBacklogToken(config.backlogDomain, token);
      const authInfo: AuthInfo = {
        token,
        clientId: String(user.id),
        scopes: [],
        expiresAt: Math.floor(Date.now() / 1000) + CACHE_TTL_MS / 1000,
      };
      store.cacheVerification(token, authInfo, CACHE_TTL_MS);
      c.set('authInfo', authInfo);
      await next();
    } catch (err) {
      logger.warn({ err }, 'Bearer token verification failed');
      c.header(
        'WWW-Authenticate',
        `Bearer error="invalid_token", error_description="Token verification failed", resource_metadata="${resourceMetadataUrl}"`
      );
      return c.json({ error: 'invalid_token', error_description: 'Token verification failed' }, 401);
    }
  };
}
