// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import type { Server } from 'node:http';
import { serve } from '@hono/node-server';

import {
  hostHeaderValidation,
  localhostHostValidation,
  localhostOriginValidation,
  originValidation,
} from '@modelcontextprotocol/hono';
import type { AuthInfo } from '@modelcontextprotocol/server';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { Hono } from 'hono';
import type { BacklogOAuthConfig } from './auth/backlogOAuthConfig.js';
import type { TokenStore } from './auth/tokenStore.js';
import { logger } from './utils/logger.js';
import type { BacklogMCPServer } from './utils/wrapServerWithToolRegistry.js';

type RunHttpMcpServerOptions = {
  host: string;
  port: number;
  path: string;
  version: string;
  enableJsonResponse: boolean;
  allowedHosts?: string[];
  allowedOrigins?: string[];
  createServer: () => BacklogMCPServer;
  oauthConfig?: BacklogOAuthConfig;
  tokenStore?: TokenStore;
};

type HttpMcpServerHandle = {
  httpServer: Server;
  shutdown: () => Promise<void>;
};

const LOCALHOST_BINDS = ['127.0.0.1', 'localhost', '::1'];

export const runHttpMcpServer = async (
  options: RunHttpMcpServerOptions
): Promise<HttpMcpServerHandle> => {
  const {
    host,
    port,
    path: mcpPath,
    version,
    enableJsonResponse,
    allowedHosts,
    allowedOrigins,
    createServer,
    oauthConfig,
    tokenStore,
  } = options;

  if ((host === '0.0.0.0' || host === '::') && !allowedHosts?.length) {
    logger.warn(
      'Binding to all interfaces without --http-allowed-hosts. ' +
        'Set allowed Host values to prevent DNS rebinding attacks.'
    );
  }

  const app = new Hono<{ Variables: { authInfo?: AuthInfo } }>();
  const isLocalhostBind = LOCALHOST_BINDS.includes(host);
  const oauthEnabled = !!(oauthConfig && tokenStore);

  // DNS rebinding protection. `Host` is the actual defense: a rebinding page
  // reaches us carrying its own hostname, which the allow list rejects.
  if (allowedHosts?.length) {
    app.use('*', hostHeaderValidation(allowedHosts));
  } else if (isLocalhostBind) {
    app.use('*', localhostHostValidation());
  }

  // `Origin` is a separate axis and cannot be derived from the allow list: a
  // browser client's Origin is its own site, never this server's hostname, so
  // validating one against the other would reject every legitimate remote
  // client. Default to the localhost set only for a bare loopback bind (the
  // desktop case, where a drive-by page is the threat); a deployment that
  // declares its hosts opts out unless it names its client origins too.
  if (allowedOrigins?.length) {
    app.use('*', originValidation(allowedOrigins));
  } else if (isLocalhostBind && !allowedHosts?.length) {
    app.use('*', localhostOriginValidation());
  }

  app.get('/health', (c) =>
    c.json({ status: 'healthy', timestamp: new Date().toISOString(), version })
  );

  if (oauthEnabled) {
    const { createOAuthRoutes } = await import('./auth/oauthRoutes.js');
    const { createBearerAuthMiddleware } =
      await import('./auth/bearerAuthMiddleware.js');

    app.route('/', createOAuthRoutes(oauthConfig, tokenStore, mcpPath));
    app.use(
      mcpPath,
      createBearerAuthMiddleware(tokenStore, oauthConfig, mcpPath)
    );
  }

  // MCP 2026-07-28 removed protocol sessions: every request is self-contained,
  // so the handler builds a fresh server per request instead of keeping a
  // transport map keyed by mcp-session-id. `legacy` defaults to 'stateless',
  // which keeps 2025-era clients working over the same endpoint.
  const mcpHandler = createMcpHandler(() => createServer(), {
    responseMode: enableJsonResponse ? 'json' : 'auto',
    onerror: (err) => logger.error({ err }, 'MCP handler error'),
  });

  // The bearer middleware owns the OAuth request context: it scopes the access
  // token around this dispatch and converts a Backlog rejection into a 401.
  app.all(mcpPath, async (c) => {
    const authInfo = oauthEnabled ? c.get('authInfo') : undefined;

    try {
      return await mcpHandler.fetch(c.req.raw, { authInfo });
    } catch (error) {
      logger.error({ err: error }, 'Error handling MCP request');
      return c.json(
        {
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        },
        500
      );
    }
  });

  const httpServer = await new Promise<Server>((resolve, reject) => {
    const srv = serve({ fetch: app.fetch, port, hostname: host }, () =>
      resolve(srv as Server)
    );
    srv.on('error', reject);
  });

  const shutdown = async () => {
    try {
      await mcpHandler.close();
    } catch {
      /* ignore */
    }
    httpServer.closeAllConnections();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  };

  return { httpServer, shutdown };
};
