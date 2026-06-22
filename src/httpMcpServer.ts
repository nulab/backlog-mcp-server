// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { randomUUID } from 'node:crypto';

import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { Hono } from 'hono';
import { runWithAccessToken } from './auth/backlogAuthContext.js';
import type { BacklogOAuthConfig } from './auth/backlogOAuthConfig.js';
import type { TokenStore } from './auth/tokenStore.js';
import { logger } from './utils/logger.js';
import type { BacklogMCPServer } from './utils/wrapServerWithToolRegistry.js';

export type SessionTransports = Record<
  string,
  WebStandardStreamableHTTPServerTransport
>;

export type CreateMcpHonoAppOptions = {
  path: string;
  version: string;
  enableJsonResponse: boolean;
  /**
   * Host header values accepted as a DNS-rebinding guard. When omitted, the
   * Host header is not checked (appropriate when fronted by a platform that
   * controls the hostname, e.g. Cloudflare Workers).
   */
  allowedHosts?: string[];
  createServer: () => BacklogMCPServer;
  /**
   * Session-id keyed transport registry. Owned by the caller so its lifetime
   * (and therefore session statefulness) is controlled externally — a Durable
   * Object instance for Workers, or a process-lifetime object for Node.
   */
  transports: SessionTransports;
  oauthConfig?: BacklogOAuthConfig;
  tokenStore?: TokenStore;
};

type JsonRpcErrorBody = {
  jsonrpc: '2.0';
  error: { code: number; message: string };
  id: null;
};

const jsonRpcError = (code: number, message: string): JsonRpcErrorBody => {
  return { jsonrpc: '2.0', error: { code, message }, id: null };
};

const bodyContainsInitialize = (body: unknown): boolean => {
  return (Array.isArray(body) ? body : [body]).some(isInitializeRequest);
};

const parseHostname = (hostHeader: string): string | null => {
  try {
    return new URL(`http://${hostHeader}`).hostname;
  } catch {
    return null;
  }
};

const checkHostHeader = (
  hostHeader: string | null,
  allowedHostnames: string[]
): JsonRpcErrorBody | null => {
  if (!hostHeader) return jsonRpcError(-32000, 'Missing Host header');
  const hostname = parseHostname(hostHeader);
  if (hostname === null) {
    return jsonRpcError(-32000, `Invalid Host header: ${hostHeader}`);
  }
  return allowedHostnames.includes(hostname)
    ? null
    : jsonRpcError(-32000, `Invalid Host: ${hostname}`);
};

const startNewSession = async (
  req: Request,
  body: unknown,
  enableJsonResponse: boolean,
  transports: SessionTransports,
  createServer: () => BacklogMCPServer,
  authInfo?: AuthInfo
): Promise<Response> => {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    enableJsonResponse,
    onsessioninitialized: (sid) => {
      transports[sid] = transport;
    },
  });

  transport.onclose = () => {
    const sid = transport.sessionId;
    if (sid) delete transports[sid];
  };

  await createServer().connect(transport);
  return transport.handleRequest(req, { parsedBody: body, authInfo });
};

/**
 * Builds the Web-standard Hono application that serves the MCP endpoint and,
 * when OAuth is configured, the OAuth authorization-server routes.
 *
 * The returned app is runtime-agnostic (`app.fetch(Request) => Response`) so it
 * can be served directly from a Cloudflare Workers / Durable Object `fetch`
 * handler, or any other Web-standard fetch runtime.
 */
export const createMcpHonoApp = async (
  options: CreateMcpHonoAppOptions
): Promise<Hono<{ Variables: { authInfo?: AuthInfo } }>> => {
  const {
    path: mcpPath,
    version,
    enableJsonResponse,
    allowedHosts,
    createServer,
    transports,
    oauthConfig,
    tokenStore,
  } = options;

  const app = new Hono<{ Variables: { authInfo?: AuthInfo } }>();
  const allowedHostnames = allowedHosts?.length ? allowedHosts : undefined;
  const oauthEnabled = !!(oauthConfig && tokenStore);

  if (allowedHostnames) {
    app.use('*', async (c, next) => {
      const hostError = checkHostHeader(
        c.req.raw.headers.get('host'),
        allowedHostnames
      );
      if (hostError) return c.json(hostError, 403);
      await next();
    });
  }

  app.get('/health', (c) =>
    c.json({ status: 'healthy', timestamp: new Date().toISOString(), version })
  );

  if (oauthEnabled) {
    const { createOAuthRoutes } = await import('./auth/oauthRoutes.js');
    const { createBearerAuthMiddleware } = await import(
      './auth/bearerAuthMiddleware.js'
    );

    app.route('/', createOAuthRoutes(oauthConfig, tokenStore, mcpPath));
    app.use(
      mcpPath,
      createBearerAuthMiddleware(tokenStore, oauthConfig, mcpPath)
    );
  }

  app.all(mcpPath, async (c) => {
    const req = c.req.raw;

    const authInfo = oauthEnabled
      ? (c.get('authInfo') as AuthInfo | undefined)
      : undefined;
    const accessToken = authInfo?.token;

    const sessionId = req.headers.get('mcp-session-id');

    try {
      if (sessionId && transports[sessionId]) {
        const handleExisting = () =>
          transports[sessionId].handleRequest(req, { authInfo });
        return accessToken
          ? runWithAccessToken(accessToken, handleExisting)
          : handleExisting();
      }

      if (sessionId) {
        return c.json(
          jsonRpcError(
            -32000,
            'Bad Request: Unknown or expired session ID. Send a new initialize request without mcp-session-id.'
          ),
          400
        );
      }

      if (req.method !== 'POST') {
        return c.json(
          jsonRpcError(-32000, 'Bad Request: No mcp-session-id header.'),
          400
        );
      }

      const parsed = await req.json().then(
        (body: unknown) => ({ body }),
        () => null
      );
      if (!parsed) {
        return c.json(jsonRpcError(-32700, 'Parse error: Invalid JSON'), 400);
      }
      const { body } = parsed;

      if (!bodyContainsInitialize(body)) {
        const err = jsonRpcError(
          -32000,
          'Bad Request: No mcp-session-id header and body is not an initialize request.'
        );
        return c.json(Array.isArray(body) ? [err] : err, 400);
      }

      const handleNew = () =>
        startNewSession(
          req,
          body,
          enableJsonResponse,
          transports,
          createServer,
          authInfo
        );

      return accessToken
        ? runWithAccessToken(accessToken, handleNew)
        : handleNew();
    } catch (error) {
      logger.error({ err: error }, 'Error handling MCP request');
      return c.json(jsonRpcError(-32603, 'Internal server error'), 500);
    }
  });

  return app;
};
