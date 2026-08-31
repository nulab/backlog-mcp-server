// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { createHash, randomBytes } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/server';
import { runHttpMcpServer } from './httpMcpServer.js';
import type { BacklogOAuthConfig } from './auth/backlogOAuthConfig.js';
import type {
  AuthCodeEntry,
  McpRefreshEntry,
  McpTokenEntry,
  OAuthClientInfo,
  PendingAuthorization,
  TokenStore,
} from './auth/tokenStore.js';
import {
  wrapServerWithToolRegistry,
  type BacklogMCPServer,
} from './utils/wrapServerWithToolRegistry.js';

vi.mock('./auth/backlogOAuthClient.js', () => ({
  buildBacklogAuthorizationUrl: vi.fn(
    (_config: unknown, _redirect: unknown, state: string) =>
      `https://example.backlog.com/OAuth2AccessRequest.action?state=${state}`
  ),
  exchangeBacklogCode: vi.fn().mockResolvedValue({
    access_token: 'bl-access',
    token_type: 'bearer',
    expires_in: 3600,
    refresh_token: 'bl-refresh',
  }),
  refreshBacklogToken: vi.fn().mockResolvedValue({
    access_token: 'bl-new-access',
    token_type: 'bearer',
    expires_in: 3600,
    refresh_token: 'bl-new-refresh',
  }),
  verifyBacklogToken: vi.fn().mockResolvedValue({ id: 42, name: 'tester' }),
}));

const MODERN_ENVELOPE = {
  'io.modelcontextprotocol/protocolVersion': '2026-07-28',
  'io.modelcontextprotocol/clientCapabilities': {},
};

const oauthConfig: BacklogOAuthConfig = {
  clientId: 'bl-client-id',
  clientSecret: 'bl-client-secret',
  backlogDomain: 'example.backlog.com',
  serverBaseUrl: 'https://mcp.example.com',
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

/**
 * A `TokenStore` whose every method is `async`, standing in for anything that
 * has to cross a network — Redis, DynamoDB, a Durable Object.
 *
 * The point is not the Map behind it. It is that the OAuth flow completes
 * against a store that answers with Promises only, which is what a synchronous
 * `TokenStore` type made impossible to express and what an external
 * implementation would have to be.
 */
const createAsyncTokenStore = (): TokenStore & { calls: string[] } => {
  const pendingAuthorizations = new Map<string, PendingAuthorization>();
  const authorizationCodes = new Map<string, AuthCodeEntry>();
  const clients = new Map<string, OAuthClientInfo>();
  const verificationCache = new Map<
    string,
    { authInfo: unknown; expiresAt: number }
  >();
  const mcpAccessTokens = new Map<string, McpTokenEntry>();
  const mcpRefreshTokens = new Map<string, McpRefreshEntry>();
  const calls: string[] = [];

  // Resolving on a later microtask makes a missing `await` fail loudly: a
  // caller that forgets one gets a pending Promise, which is always truthy.
  const later = async <T>(name: string, value: T): Promise<T> => {
    calls.push(name);
    await Promise.resolve();
    return value;
  };

  return {
    calls,

    async storePendingAuth(backlogState, pending) {
      pendingAuthorizations.set(backlogState, pending);
      return later('storePendingAuth', undefined);
    },

    async consumePendingAuth(backlogState) {
      const entry = pendingAuthorizations.get(backlogState);
      pendingAuthorizations.delete(backlogState);
      return later('consumePendingAuth', entry);
    },

    async storeAuthCode(code, entry) {
      authorizationCodes.set(code, entry);
      return later('storeAuthCode', undefined);
    },

    async consumeAuthCode(code) {
      const entry = authorizationCodes.get(code);
      authorizationCodes.delete(code);
      if (entry && Date.now() > entry.expiresAt) {
        return later('consumeAuthCode', undefined);
      }
      return later('consumeAuthCode', entry);
    },

    async getClient(clientId) {
      return later('getClient', clients.get(clientId));
    },

    async registerClient(client) {
      clients.set(client.client_id, client);
      return later('registerClient', true);
    },

    async getCachedVerification(token) {
      const cached = verificationCache.get(token);
      if (!cached || Date.now() > cached.expiresAt) {
        return later('getCachedVerification', undefined);
      }
      return later(
        'getCachedVerification',
        cached.authInfo as Awaited<
          ReturnType<TokenStore['getCachedVerification']>
        >
      );
    },

    async cacheVerification(token, authInfo, ttlMs) {
      verificationCache.set(token, {
        authInfo,
        expiresAt: Date.now() + ttlMs,
      });
      return later('cacheVerification', undefined);
    },

    async storeMcpToken(mcpToken, entry) {
      mcpAccessTokens.set(mcpToken, entry);
      return later('storeMcpToken', undefined);
    },

    async getMcpToken(mcpToken) {
      const entry = mcpAccessTokens.get(mcpToken);
      if (entry && Date.now() > entry.expiresAt) {
        mcpAccessTokens.delete(mcpToken);
        return later('getMcpToken', undefined);
      }
      return later('getMcpToken', entry);
    },

    async storeMcpRefreshToken(mcpRefreshToken, entry) {
      mcpRefreshTokens.set(mcpRefreshToken, entry);
      return later('storeMcpRefreshToken', undefined);
    },

    async consumeMcpRefreshToken(mcpRefreshToken) {
      const entry = mcpRefreshTokens.get(mcpRefreshToken);
      mcpRefreshTokens.delete(mcpRefreshToken);
      return later('consumeMcpRefreshToken', entry);
    },

    async cleanup() {
      return later('cleanup', undefined);
    },
  };
};

const base64Url = (buffer: Buffer): string => buffer.toString('base64url');

describe('runHttpMcpServer with an injected asynchronous TokenStore', () => {
  let shutdown: (() => Promise<void>) | undefined;

  afterEach(async () => {
    await shutdown?.();
    shutdown = undefined;
  });

  const start = async (tokenStore: TokenStore): Promise<string> => {
    const handle = await runHttpMcpServer({
      host: '127.0.0.1',
      port: 0,
      path: '/mcp',
      version: '0.0.0',
      enableJsonResponse: true,
      createServer,
      oauthConfig,
      tokenStore,
    });
    shutdown = handle.shutdown;
    const { port } = handle.httpServer.address() as AddressInfo;
    return `http://127.0.0.1:${port}`;
  };

  it('completes /register -> /authorize -> /callback -> /token -> /mcp', async () => {
    const store = createAsyncTokenStore();
    const origin = await start(store);

    // 1. Dynamic client registration.
    const registration = await fetch(`${origin}/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        redirect_uris: ['https://client.example.com/cb'],
        client_name: 'async-store-client',
        application_type: 'web',
      }),
    });
    expect(registration.status).toBe(201);
    const client = (await registration.json()) as {
      client_id: string;
      client_secret: string;
    };
    expect(client.client_id).toBeTruthy();

    // 2. Authorization request. The redirect to Backlog carries the state the
    //    store was asked to hold.
    const verifier = base64Url(randomBytes(32));
    const challenge = base64Url(createHash('sha256').update(verifier).digest());
    const authorize = await fetch(
      `${origin}/authorize?${new URLSearchParams({
        client_id: client.client_id,
        redirect_uri: 'https://client.example.com/cb',
        response_type: 'code',
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state: 'client-state',
      })}`,
      { redirect: 'manual' }
    );
    expect(authorize.status).toBe(302);
    const backlogState = new URL(
      authorize.headers.get('location') ?? ''
    ).searchParams.get('state');
    expect(backlogState).toBeTruthy();

    // 3. Backlog redirects the browser back with its own code.
    const callback = await fetch(
      `${origin}/callback?${new URLSearchParams({
        code: 'backlog-code',
        state: backlogState as string,
      })}`,
      { redirect: 'manual' }
    );
    expect(callback.status).toBe(302);
    const callbackTarget = new URL(callback.headers.get('location') ?? '');
    expect(callbackTarget.origin + callbackTarget.pathname).toBe(
      'https://client.example.com/cb'
    );
    expect(callbackTarget.searchParams.get('state')).toBe('client-state');
    const mcpCode = callbackTarget.searchParams.get('code');
    expect(mcpCode).toBeTruthy();

    // 4. Token exchange.
    const token = await fetch(`${origin}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: client.client_id,
        client_secret: client.client_secret,
        code: mcpCode as string,
        code_verifier: verifier,
        redirect_uri: 'https://client.example.com/cb',
      }).toString(),
    });
    expect(token.status).toBe(200);
    const tokens = (await token.json()) as {
      access_token: string;
      refresh_token: string;
    };
    expect(tokens.access_token).toBeTruthy();

    // 5. An authenticated MCP call.
    const mcp = await fetch(`${origin}/mcp`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        authorization: `Bearer ${tokens.access_token}`,
        'mcp-method': 'tools/list',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: { _meta: MODERN_ENVELOPE },
      }),
    });
    expect(mcp.status).toBe(200);
    expect(await mcp.text()).toContain('ping');

    // Every stage went through the injected store rather than a default one.
    expect(store.calls).toEqual(
      expect.arrayContaining([
        'registerClient',
        'getClient',
        'storePendingAuth',
        'consumePendingAuth',
        'storeAuthCode',
        'consumeAuthCode',
        'storeMcpToken',
        'storeMcpRefreshToken',
        'getMcpToken',
        'cacheVerification',
      ])
    );
  });

  it('refreshes an access token through the same store', async () => {
    const store = createAsyncTokenStore();
    const origin = await start(store);

    await store.registerClient({
      client_id: 'c-refresh',
      client_secret: 's-refresh',
      client_id_issued_at: 0,
      client_secret_expires_at: 0,
      redirect_uris: ['https://client.example.com/cb'],
    });
    await store.storeMcpRefreshToken('mcp-refresh', {
      backlogRefreshToken: 'bl-refresh',
      clientId: 'c-refresh',
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });

    const res = await fetch(`${origin}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: 'c-refresh',
        client_secret: 's-refresh',
        refresh_token: 'mcp-refresh',
      }).toString(),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { access_token: string };
    expect(body.access_token).toBeTruthy();
    expect(store.calls).toContain('consumeMcpRefreshToken');
  });

  it('rejects an unknown bearer token', async () => {
    const store = createAsyncTokenStore();
    const origin = await start(store);

    const res = await fetch(`${origin}/mcp`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        authorization: 'Bearer not-a-token',
        'mcp-method': 'tools/list',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: { _meta: MODERN_ENVELOPE },
      }),
    });

    expect(res.status).toBe(401);
    expect(store.calls).toContain('getMcpToken');
  });
});
