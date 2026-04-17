// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { serve } from '@hono/node-server';

import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { Hono } from 'hono';
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

const bodyContainsInitialize = (body: unknown): boolean => {
  return (Array.isArray(body) ? body : [body]).some(isInitializeRequest);
};

const buildAllowedHostnames = (
  host: string,
  allowedHosts?: string[]
): string[] | undefined => {
  if (allowedHosts?.length) return allowedHosts;
  const localhostHosts = ['127.0.0.1', 'localhost', '::1'];
  return localhostHosts.includes(host)
    ? ['localhost', '127.0.0.1', '[::1]']
    : undefined;
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
  transports: Record<string, WebStandardStreamableHTTPServerTransport>,
  createServer: () => BacklogMCPServer
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
  return transport.handleRequest(req, { parsedBody: body });
};

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
  } = options;

  if ((host === '0.0.0.0' || host === '::') && !allowedHosts?.length) {
    logger.warn(
      'Binding to all interfaces without --http-allowed-hosts. ' +
        'Set allowed Host values to prevent DNS rebinding attacks.'
    );
  }

  const app = new Hono();
  const transports: Record<string, WebStandardStreamableHTTPServerTransport> =
    {};
  const allowedHostnames = buildAllowedHostnames(host, allowedHosts);

  app.get('/health', (c) =>
    c.json({ status: 'healthy', timestamp: new Date().toISOString(), version })
  );

  app.all(mcpPath, async (c) => {
    const req = c.req.raw;

    if (allowedHostnames) {
      const hostError = checkHostHeader(
        req.headers.get('host'),
        allowedHostnames
      );
      if (hostError) return c.json(hostError, 403);
    }

    const sessionId = req.headers.get('mcp-session-id');

    try {
      if (sessionId && transports[sessionId]) {
        return transports[sessionId].handleRequest(req);
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

      return startNewSession(
        req,
        body,
        enableJsonResponse,
        transports,
        createServer
      );
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
    for (const sid of Object.keys(transports)) {
      try {
        await transports[sid].close();
      } catch {
        /* ignore */
      }
      delete transports[sid];
    }
    httpServer.closeAllConnections();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  };

  return { httpServer, shutdown };
};
