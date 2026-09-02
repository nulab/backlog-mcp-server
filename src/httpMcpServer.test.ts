// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { describe, it, expect, afterEach } from 'vitest';
import { request as httpRequest } from 'node:http';
import type { AddressInfo } from 'node:net';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/server';
import { runHttpMcpServer } from './httpMcpServer.js';
import { createTokenStore } from './auth/tokenStore.js';
import type { BacklogOAuthConfig } from './auth/backlogOAuthConfig.js';
import { backlogErrorHandler } from './backlog/backlogErrorHandler.js';
import {
  wrapServerWithToolRegistry,
  type BacklogMCPServer,
} from './utils/wrapServerWithToolRegistry.js';

// The 2026-07-28 request envelope, carried in `_meta` on every request now
// that there is no `initialize` handshake to negotiate it once.
const MODERN_ENVELOPE = {
  'io.modelcontextprotocol/protocolVersion': '2026-07-28',
  'io.modelcontextprotocol/clientCapabilities': {},
};

const createServer = (): BacklogMCPServer => {
  const server = wrapServerWithToolRegistry(
    new McpServer({ name: 'backlog-test', version: '0.0.0' })
  );
  server.registerOnce('ping', 'test tool', z.object({}), () => ({
    content: [{ type: 'text' as const, text: 'pong' }],
  }));
  return server;
};

type RawResponse = {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
};

/**
 * Raw node:http request. `fetch` treats `Host` as a forbidden header, so the
 * DNS-rebinding cases have to be driven at this level to set it at all.
 */
const send = (
  port: number,
  options: { method?: string; headers?: Record<string, string>; body?: string }
): Promise<RawResponse> =>
  new Promise((resolve, reject) => {
    const req = httpRequest(
      {
        host: '127.0.0.1',
        port,
        path: '/mcp',
        method: options.method ?? 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          ...options.headers,
        },
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () =>
          resolve({ status: res.statusCode ?? 0, headers: res.headers, body })
        );
      }
    );
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });

const modernToolsList = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: { _meta: MODERN_ENVELOPE },
});

describe('runHttpMcpServer', () => {
  let shutdown: (() => Promise<void>) | undefined;

  const start = async (
    overrides: Partial<Parameters<typeof runHttpMcpServer>[0]> = {}
  ): Promise<number> => {
    const handle = await runHttpMcpServer({
      host: '127.0.0.1',
      port: 0,
      path: '/mcp',
      version: '0.0.0',
      enableJsonResponse: true,
      createServer,
      ...overrides,
    });
    shutdown = handle.shutdown;
    return (handle.httpServer.address() as AddressInfo).port;
  };

  afterEach(async () => {
    await shutdown?.();
    shutdown = undefined;
  });

  describe('DNS rebinding protection on a loopback bind', () => {
    it('serves a request with a localhost Host and no Origin', async () => {
      const port = await start();
      const res = await send(port, {
        headers: { 'mcp-method': 'tools/list' },
        body: modernToolsList,
      });

      expect(res.status).toBe(200);
      expect(res.body).toContain('ping');
    });

    it('rejects a foreign Host header', async () => {
      const port = await start();
      const res = await send(port, {
        headers: { host: 'evil.example.com', 'mcp-method': 'tools/list' },
        body: modernToolsList,
      });

      expect(res.status).toBe(403);
    });

    it('rejects a foreign Origin header', async () => {
      const port = await start();
      const res = await send(port, {
        headers: {
          origin: 'http://evil.example.com',
          'mcp-method': 'tools/list',
        },
        body: modernToolsList,
      });

      expect(res.status).toBe(403);
    });
  });

  describe('allowedHosts on a loopback bind (reverse-proxy deployment)', () => {
    // Regression: pinning Origin to localhost here 403s every browser-based
    // client behind a proxy, with no way to opt out. A browser client's Origin
    // is its own site, so it can never be derived from the host allow list.
    it('serves a browser client whose Origin is its own site', async () => {
      const port = await start({ allowedHosts: ['mcp.example.com'] });
      const res = await send(port, {
        headers: {
          host: 'mcp.example.com',
          origin: 'https://claude.ai',
          'mcp-method': 'tools/list',
        },
        body: modernToolsList,
      });

      expect(res.status).toBe(200);
      expect(res.body).toContain('ping');
    });

    it('rejects a Host outside the allow list', async () => {
      const port = await start({ allowedHosts: ['mcp.example.com'] });
      const res = await send(port, {
        headers: { host: 'evil.example.com', 'mcp-method': 'tools/list' },
        body: modernToolsList,
      });

      expect(res.status).toBe(403);
    });

    it('no longer accepts a localhost Host once an allow list is set', async () => {
      const port = await start({ allowedHosts: ['mcp.example.com'] });
      const res = await send(port, {
        headers: { host: '127.0.0.1', 'mcp-method': 'tools/list' },
        body: modernToolsList,
      });

      expect(res.status).toBe(403);
    });
  });

  describe('allowedOrigins', () => {
    it('serves an Origin on the list', async () => {
      const port = await start({
        allowedHosts: ['mcp.example.com'],
        allowedOrigins: ['claude.ai'],
      });
      const res = await send(port, {
        headers: {
          host: 'mcp.example.com',
          origin: 'https://claude.ai',
          'mcp-method': 'tools/list',
        },
        body: modernToolsList,
      });

      expect(res.status).toBe(200);
    });

    it('rejects an Origin off the list', async () => {
      const port = await start({
        allowedHosts: ['mcp.example.com'],
        allowedOrigins: ['claude.ai'],
      });
      const res = await send(port, {
        headers: {
          host: 'mcp.example.com',
          origin: 'https://evil.example.com',
          'mcp-method': 'tools/list',
        },
        body: modernToolsList,
      });

      expect(res.status).toBe(403);
    });
  });

  describe('2025-era session operations', () => {
    // The protocol is stateless now, so nothing is kept between requests.
    it.each(['GET', 'DELETE'])('answers %s with 405', async (method) => {
      const port = await start();
      const res = await send(port, {
        method,
        headers: { 'mcp-session-id': 'stale-session' },
      });

      expect(res.status).toBe(405);
    });
  });

  describe('modern header validation', () => {
    it('rejects a mismatched Mcp-Method with -32020', async () => {
      const port = await start();
      const res = await send(port, {
        headers: { 'mcp-method': 'tools/call' },
        body: modernToolsList,
      });

      expect(res.status).toBe(400);
      expect(JSON.parse(res.body).error.code).toBe(-32020);
    });
  });

  // End to end for #213: an OAuth-authenticated tool call that Backlog rejects
  // has to reach the client as a transport 401, not as tool output on a 200.
  describe('a Backlog 401 under OAuth', () => {
    const oauthConfig: BacklogOAuthConfig = {
      clientId: 'cid',
      clientSecret: 'csecret',
      backlogDomain: 'example.backlog.com',
      serverBaseUrl: 'https://mcp.example.com',
    };

    const backlogAuthError = {
      _name: 'BacklogAuthError',
      _status: 401,
      _url: 'https://example.backlog.com/api/v2/users/myself',
    };

    // A tool shaped like the real ones: the Backlog rejection is funnelled
    // through backlogErrorHandler and returned as a result, never thrown.
    const createRejectingServer = (): BacklogMCPServer => {
      const server = wrapServerWithToolRegistry(
        new McpServer({ name: 'backlog-test', version: '0.0.0' })
      );
      server.registerOnce('get_myself', 'test tool', z.object({}), () => {
        const { message } = backlogErrorHandler(backlogAuthError);
        return { content: [{ type: 'text' as const, text: message }] };
      });
      return server;
    };

    const toolsCall = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'get_myself', arguments: {}, _meta: MODERN_ENVELOPE },
    });

    const startOAuth = async (store: ReturnType<typeof createTokenStore>) =>
      start({
        createServer: createRejectingServer,
        oauthConfig,
        tokenStore: store,
      });

    const seed = (store: ReturnType<typeof createTokenStore>) => {
      store.storeMcpToken('mcp-token', {
        backlogAccessToken: 'bl-token',
        clientId: 'c1',
        expiresAt: Date.now() + 3600_000,
      });
      store.cacheVerification(
        'mcp-token',
        { token: 'bl-token', clientId: '1', scopes: [], expiresAt: 0 },
        300_000
      );
    };

    const callTool = (port: number) =>
      send(port, {
        headers: {
          authorization: 'Bearer mcp-token',
          'mcp-method': 'tools/call',
          'mcp-name': 'get_myself',
        },
        body: toolsCall,
      });

    it('answers 401 with WWW-Authenticate instead of 200', async () => {
      const store = createTokenStore();
      seed(store);
      const port = await startOAuth(store);

      const res = await callTool(port);

      expect(res.status).toBe(401);
      expect(JSON.parse(res.body).error).toBe('invalid_token');
      // The header, not the status, is what makes this recoverable: the client
      // reads `resource_metadata` from it to find where to re-authenticate. It
      // reaches the wire through Hono's `c.res` setter, which merges the
      // headers of the response it replaces, so it is worth pinning.
      expect(res.headers['www-authenticate']).toContain(
        `resource_metadata="${oauthConfig.serverBaseUrl}/.well-known/oauth-protected-resource/mcp"`
      );
      expect(res.headers['www-authenticate']).toContain(
        'error="invalid_token"'
      );
    });

    it('revokes the token, so the next call is rejected up front', async () => {
      const store = createTokenStore();
      seed(store);
      const port = await startOAuth(store);

      await callTool(port);
      const res = await callTool(port);

      expect(res.status).toBe(401);
      expect(store.getMcpToken('mcp-token')).toBeUndefined();
      expect(store.getCachedVerification('mcp-token')).toBeUndefined();
    });
  });
});
