import type { MiddlewareHandler } from 'hono';
import type { AuthInfo } from '@modelcontextprotocol/server';
import type { BacklogOAuthConfig } from './backlogOAuthConfig.js';
import { isTokenRejected, verifyBacklogToken } from './backlogOAuthClient.js';
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
        // Only a Backlog rejection means re-authenticate; see `isTokenRejected`.
        if (!isTokenRejected(err)) {
          logger.error(
            { err },
            'Could not verify the bearer token with Backlog'
          );
          c.header('Retry-After', '30');
          return c.json(
            {
              error: 'temporarily_unavailable',
              error_description: 'Could not verify the token with Backlog',
            },
            503
          );
        }

        // Drop the spent token so the next request fails `getMcpToken` and the
        // client refreshes instead of replaying a credential that cannot work.
        logger.warn(
          { err, clientId: tokenEntry.clientId },
          'Backlog rejected the stored access token during verification; revoking the MCP token'
        );
        store.revokeMcpToken(mcpToken);
        return unauthorized('Token verification failed');
      }
    }

    c.set('authInfo', authInfo);

    // A Backlog rejection is an auth event, not a tool failure: revoke so the
    // client re-authenticates. Done on report, not after `next()` settles,
    // because an SSE response resolves before its handler has run.
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
