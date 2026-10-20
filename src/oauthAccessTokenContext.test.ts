import { describe, it, expect, afterEach } from 'vite-plus/test';
import { request as httpRequest } from 'node:http';
import type { AddressInfo } from 'node:net';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/server';
import { runHttpMcpServer } from './httpMcpServer.js';
import { getCurrentAccessToken } from './auth/backlogAuthContext.js';
import { createTokenStore } from './auth/tokenStore.js';
import type { BacklogOAuthConfig } from './auth/backlogOAuthConfig.js';
import {
  wrapServerWithToolRegistry,
  type BacklogMCPServer,
} from './utils/wrapServerWithToolRegistry.js';

// OAuth tools read the access token from AsyncLocalStorage at tool time. If the SDK ever
// resolved `fetch` before running the tool, every OAuth tool call would fail.

const MODERN_PROTOCOL_VERSION = '2026-07-28';
const MODERN_ENVELOPE = {
  'io.modelcontextprotocol/protocolVersion': MODERN_PROTOCOL_VERSION,
  'io.modelcontextprotocol/clientCapabilities': {},
};

const MCP_TOKEN = 'mcp-token-1';
const BACKLOG_TOKEN = 'backlog-access-token-1';

const oauthConfig: BacklogOAuthConfig = {
  clientId: 'bl-client-id',
  clientSecret: 'bl-client-secret',
  backlogDomain: 'example.backlog.com',
  serverBaseUrl: 'https://mcp.example.com',
};

const createServer = (): BacklogMCPServer => {
  const server = wrapServerWithToolRegistry(
    new McpServer({ name: 'probe', version: '0.0.0' })
  );
  server.registerOnce('whoami', 'reports the ambient token', z.object({}), () =>
    Promise.resolve({
      content: [
        {
          type: 'text' as const,
          text: getCurrentAccessToken() ?? '<no token in context>',
        },
      ],
    })
  );
  return server;
};

const call = (port: number, token?: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'whoami', arguments: {}, _meta: MODERN_ENVELOPE },
    });
    const req = httpRequest(
      {
        host: '127.0.0.1',
        port,
        path: '/mcp',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          'mcp-protocol-version': MODERN_PROTOCOL_VERSION,
          'mcp-method': 'tools/call',
          'mcp-name': 'whoami',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let out = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (out += c));
        res.on('end', () => resolve(out));
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });

describe('OAuth access token reaches the tool through AsyncLocalStorage', () => {
  let shutdown: (() => Promise<void>) | undefined;

  const start = async (enableJsonResponse: boolean): Promise<number> => {
    const tokenStore = createTokenStore();
    tokenStore.storeMcpToken(MCP_TOKEN, {
      backlogAccessToken: BACKLOG_TOKEN,
      clientId: 'c1',
      expiresAt: Date.now() + 60_000,
    });
    // Pre-seeded so the bearer middleware does not call out to Backlog.
    tokenStore.cacheVerification(
      MCP_TOKEN,
      {
        token: BACKLOG_TOKEN,
        clientId: 'c1',
        scopes: [],
        expiresAt: Math.floor(Date.now() / 1000) + 60,
      },
      60_000
    );

    const handle = await runHttpMcpServer({
      host: '127.0.0.1',
      port: 0,
      path: '/mcp',
      version: '0.0.0',
      enableJsonResponse,
      createServer,
      oauthConfig,
      tokenStore,
    });
    shutdown = handle.shutdown;
    return (handle.httpServer.address() as AddressInfo).port;
  };

  afterEach(async () => {
    await shutdown?.();
    shutdown = undefined;
  });

  it.each([
    ['json', true],
    ['auto', false],
  ])(
    'the tool observes the bearer token in %s response mode',
    async (_mode, enableJsonResponse) => {
      const port = await start(enableJsonResponse);

      const out = await call(port, MCP_TOKEN);

      expect(out).toContain(BACKLOG_TOKEN);
      expect(out).not.toContain('<no token in context>');
    }
  );

  it('rejects the call before any tool runs when the bearer token is missing', async () => {
    const port = await start(true);

    const out = await call(port);

    expect(out).toContain('invalid_token');
    expect(out).not.toContain(BACKLOG_TOKEN);
  });
});
