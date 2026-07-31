// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import type { Server } from 'node:http';
import { serve } from '@hono/node-server';

import {
  hostHeaderValidation,
  localhostHostValidation,
  localhostOriginValidation,
} from '@modelcontextprotocol/hono';
import type { AuthInfo } from '@modelcontextprotocol/server';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { Hono } from 'hono';
import { runWithAccessToken } from './auth/backlogAuthContext.js';
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
  createServer: () => BacklogMCPServer;
  oauthConfig?: BacklogOAuthConfig;
  tokenStore?: TokenStore;
};

type HttpMcpServerHandle = {
  httpServer: Server;
  shutdown: () => Promise<void>;
};

type JsonRpcErrorBody = {
  jsonrpc: '2.0';
  error: { code: number; message: string };
  id: null;
};

const jsonRpcError = (code: number, message: string): JsonRpcErrorBody => {
  return { jsonrpc: '2.0', error: { code, message }, id: null };
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

  // DNS rebinding protection: validate Host against the explicit allow list
  // when one is given, and against the localhost set when bound to loopback.
  if (allowedHosts?.length) {
    app.use('*', hostHeaderValidation(allowedHosts));
  } else if (isLocalhostBind) {
    app.use('*', localhostHostValidation());
  }
  if (isLocalhostBind) {
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

  app.all(mcpPath, async (c) => {
    const authInfo = oauthEnabled ? c.get('authInfo') : undefined;
    const accessToken = authInfo?.token;

    try {
      const dispatch = () => mcpHandler.fetch(c.req.raw, { authInfo });
      return accessToken
        ? await runWithAccessToken(accessToken, dispatch)
        : await dispatch();
    } catch (error) {
      logger.error({ err: error }, 'Error handling MCP request');
      return c.json(jsonRpcError(-32603, 'Internal server error'), 500);
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
