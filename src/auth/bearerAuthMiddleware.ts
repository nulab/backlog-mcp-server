// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import type { MiddlewareHandler } from 'hono';
import type { AuthInfo } from '@modelcontextprotocol/server';
import type { BacklogOAuthConfig } from './backlogOAuthConfig.js';
import { verifyBacklogToken } from './backlogOAuthClient.js';
import {
  hasBacklogAuthErrorBeenReported,
  runWithAccessToken,
} from './backlogAuthContext.js';
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

  const wwwAuthenticate = (description?: string): string =>
    description
      ? `Bearer error="invalid_token", error_description="${description}", resource_metadata="${resourceMetadataUrl}"`
      : `Bearer resource_metadata="${resourceMetadataUrl}"`;

  return async (c, next) => {
    const unauthorized = (description: string, header = description) => {
      c.header('WWW-Authenticate', wwwAuthenticate(header));
      return c.json(
        { error: 'invalid_token', error_description: description },
        401
      );
    };

    const authHeader = c.req.header('authorization');

    if (!authHeader) {
      c.header('WWW-Authenticate', wwwAuthenticate());
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
      return unauthorized(
        'Expected Bearer token',
        'Invalid Authorization header format'
      );
    }

    const tokenEntry = store.getMcpToken(mcpToken);
    if (!tokenEntry) {
      return unauthorized('Unknown or expired token');
    }

    let authInfo = store.getCachedVerification(mcpToken);

    if (!authInfo) {
      try {
        const user = await verifyBacklogToken(
          config.backlogDomain,
          tokenEntry.backlogAccessToken
        );
        authInfo = {
          token: tokenEntry.backlogAccessToken,
          clientId: String(user.id),
          scopes: [],
          expiresAt: Math.floor(Date.now() / 1000) + CACHE_TTL_MS / 1000,
        } satisfies AuthInfo;
        store.cacheVerification(mcpToken, authInfo, CACHE_TTL_MS);
      } catch (err) {
        logger.warn({ err }, 'Bearer token verification failed');
        return unauthorized('Token verification failed');
      }
    }

    c.set('authInfo', authInfo);

    // The stored token is the only credential a downstream Backlog call has, so
    // Backlog rejecting it is an authentication event and not a tool failure.
    // Dropping the entry here is what lets the client recover: the next request
    // fails the `getMcpToken` check above and is told to re-authenticate.
    //
    // Invalidation happens the moment the failure is reported rather than after
    // `next()` settles, because a response that upgraded to SSE resolves before
    // its handler has run.
    const onAuthError = () => {
      logger.warn(
        { clientId: tokenEntry.clientId },
        'Backlog rejected the stored access token; revoking the MCP token'
      );
      store.revokeMcpToken(mcpToken);
    };

    await runWithAccessToken(
      tokenEntry.backlogAccessToken,
      async () => {
        await next();
        // Read inside the context: `next()` resolving is not the end of the
        // async scope, but it is the point at which the response is decided.
        if (hasBacklogAuthErrorBeenReported()) {
          c.res = unauthorized('Backlog rejected the access token');
        }
      },
      onAuthError
    );
  };
}
