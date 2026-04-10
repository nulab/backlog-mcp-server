// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import type { Request, Response } from 'express';
import { logger } from './utils/logger.js';
import type { BacklogMCPServer } from './utils/wrapServerWithToolRegistry.js';

export type RunHttpMcpServerOptions = {
  host: string;
  port: number;
  path: string;
  version: string;
  enableJsonResponse: boolean;
  allowedHosts?: string[];
  createServer: () => BacklogMCPServer;
};

export type HttpMcpServerHandle = {
  httpServer: Server;
  shutdown: () => Promise<void>;
};

function bodyContainsInitialize(body: unknown): boolean {
  if (Array.isArray(body)) {
    return body.some((msg) => isInitializeRequest(msg));
  }
  return isInitializeRequest(body);
}

export async function runHttpMcpServer(
  options: RunHttpMcpServerOptions
): Promise<HttpMcpServerHandle> {
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

  const app = createMcpExpressApp({ host, allowedHosts });
  const transports: Record<string, StreamableHTTPServerTransport> = {};

  const mcpPostHandler = async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    try {
      if (sessionId && transports[sessionId]) {
        await transports[sessionId].handleRequest(req, res, req.body);
        return;
      }

      if (!sessionId && bodyContainsInitialize(req.body)) {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          enableJsonResponse,
          onsessioninitialized: (sid) => {
            transports[sid] = transport;
          },
        });

        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid && transports[sid]) {
            delete transports[sid];
          }
        };

        const server = createServer();
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      }

      const errorObj = {
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: sessionId
            ? 'Bad Request: Unknown or expired session ID. Send a new initialize request without mcp-session-id.'
            : 'Bad Request: No mcp-session-id header and body is not an initialize request.',
        },
        id: null,
      };
      res.status(400).json(Array.isArray(req.body) ? [errorObj] : errorObj);
    } catch (error) {
      logger.error({ err: error }, 'Error handling MCP POST');
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  };

  const mcpSessionHandler = async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    try {
      await transports[sessionId].handleRequest(req, res);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'ECONNRESET' || code === 'EPIPE') {
        logger.debug({ err: error }, `MCP ${req.method} client disconnected`);
        return;
      }
      logger.error({ err: error }, `Error handling MCP ${req.method}`);
      if (!res.headersSent) {
        res.status(500).send('Internal server error');
      }
    }
  };

  app.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version,
    });
  });

  app.post(mcpPath, mcpPostHandler);
  app.get(mcpPath, mcpSessionHandler);
  app.delete(mcpPath, mcpSessionHandler);

  const httpServer = await new Promise<Server>((resolve, reject) => {
    const srv = app.listen(port, host, () => resolve(srv));
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
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  };

  return { httpServer, shutdown };
}
