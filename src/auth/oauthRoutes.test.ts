// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';
import { createOAuthRoutes } from './oauthRoutes.js';
import { TokenStore } from './tokenStore.js';
import type { BacklogOAuthConfig } from './backlogOAuthConfig.js';

vi.mock('./backlogOAuthClient.js', () => ({
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
}));

const config: BacklogOAuthConfig = {
  clientId: 'bl-client-id',
  clientSecret: 'bl-client-secret',
  backlogDomain: 'example.backlog.com',
  serverBaseUrl: 'https://mcp.example.com',
};

describe('createOAuthRoutes', () => {
  let store: TokenStore;
  let app: ReturnType<typeof createOAuthRoutes>;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new TokenStore();
    app = createOAuthRoutes(config, store, '/mcp');
  });

  describe('GET /.well-known/oauth-authorization-server', () => {
    it('returns authorization server metadata', async () => {
      const res = await app.request('/.well-known/oauth-authorization-server');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.issuer).toBe('https://mcp.example.com');
      expect(body.authorization_endpoint).toBe(
        'https://mcp.example.com/authorize'
      );
      expect(body.token_endpoint).toBe('https://mcp.example.com/token');
      expect(body.registration_endpoint).toBe(
        'https://mcp.example.com/register'
      );
      expect(body.code_challenge_methods_supported).toEqual(['S256']);
    });
  });

  describe('GET /.well-known/oauth-protected-resource/mcp', () => {
    it('returns protected resource metadata', async () => {
      const res = await app.request(
        '/.well-known/oauth-protected-resource/mcp'
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.resource).toBe('https://mcp.example.com/mcp');
      expect(body.authorization_servers).toEqual(['https://mcp.example.com']);
    });
  });

  describe('POST /register', () => {
    it('registers a client with https redirect_uri', async () => {
      const res = await app.request('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redirect_uris: ['https://client.example.com/callback'],
          client_name: 'test',
        }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.client_id).toBeDefined();
      expect(body.redirect_uris).toEqual([
        'https://client.example.com/callback',
      ]);
    });

    it('registers a client with localhost redirect_uri', async () => {
      const res = await app.request('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redirect_uris: ['http://localhost:9999/callback'],
        }),
      });
      expect(res.status).toBe(201);
    });

    it('rejects http redirect_uri on non-localhost', async () => {
      const res = await app.request('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redirect_uris: ['http://evil.com/callback'],
        }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('invalid_client_metadata');
    });

    it('rejects missing redirect_uris', async () => {
      const res = await app.request('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    it('rejects unsupported token_endpoint_auth_method', async () => {
      const res = await app.request('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redirect_uris: ['https://client.example.com/callback'],
          token_endpoint_auth_method: 'client_secret_basic',
        }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('invalid_client_metadata');
      expect(body.error_description).toContain('client_secret_basic');
    });

    it('accepts token_endpoint_auth_method=none without client_secret', async () => {
      const res = await app.request('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redirect_uris: ['https://client.example.com/callback'],
          token_endpoint_auth_method: 'none',
        }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.client_secret).toBeUndefined();
      expect(body.token_endpoint_auth_method).toBe('none');
    });
  });

  describe('GET /authorize', () => {
    it('rejects unknown client_id', async () => {
      const res = await app.request(
        '/authorize?client_id=unknown&redirect_uri=https://x.com/cb&response_type=code&code_challenge=ch&code_challenge_method=S256'
      );
      expect(res.status).toBe(400);
    });

    it('redirects to Backlog OAuth for valid request', async () => {
      store.registerClient({
        client_id: 'c1',
        client_id_issued_at: 0,
        client_secret_expires_at: 0,
        redirect_uris: ['https://client.example.com/cb'],
      });

      const res = await app.request(
        '/authorize?client_id=c1&redirect_uri=https://client.example.com/cb&response_type=code&code_challenge=test-challenge&code_challenge_method=S256&state=my-state',
        { redirect: 'manual' }
      );
      expect(res.status).toBe(302);
      const location = res.headers.get('location');
      expect(location).toContain('OAuth2AccessRequest.action');
    });

    it('rejects unregistered redirect_uri', async () => {
      store.registerClient({
        client_id: 'c1',
        client_id_issued_at: 0,
        client_secret_expires_at: 0,
        redirect_uris: ['https://client.example.com/cb'],
      });

      const res = await app.request(
        '/authorize?client_id=c1&redirect_uri=https://evil.com/cb&response_type=code&code_challenge=ch&code_challenge_method=S256'
      );
      expect(res.status).toBe(400);
    });

    it('rejects invalid resource parameter', async () => {
      store.registerClient({
        client_id: 'c1',
        client_id_issued_at: 0,
        client_secret_expires_at: 0,
        redirect_uris: ['https://client.example.com/cb'],
      });

      const res = await app.request(
        '/authorize?client_id=c1&redirect_uri=https://client.example.com/cb&response_type=code&code_challenge=ch&code_challenge_method=S256&resource=https://wrong.example.com/mcp',
        { redirect: 'manual' }
      );
      expect(res.status).toBe(302);
      const location = res.headers.get('location')!;
      expect(location).toContain('error=invalid_target');
    });
  });

  describe('GET /callback', () => {
    it('forwards Backlog authorization error to MCP client redirect_uri', async () => {
      store.registerClient({
        client_id: 'c1',
        client_id_issued_at: 0,
        client_secret_expires_at: 0,
        redirect_uris: ['https://client.example.com/cb'],
      });

      store.storePendingAuth('bl-state-1', {
        mcpClientId: 'c1',
        codeChallenge: 'ch',
        redirectUri: 'https://client.example.com/cb',
        scopes: [],
        state: 'mcp-state-1',
        createdAt: Date.now(),
      });

      const res = await app.request(
        '/callback?error=access_denied&error_description=User+denied&state=bl-state-1',
        { redirect: 'manual' }
      );
      expect(res.status).toBe(302);
      const location = res.headers.get('location')!;
      expect(location).toContain('error=access_denied');
      expect(location).toContain('state=mcp-state-1');
    });

    it('returns 400 for missing state parameter', async () => {
      const res = await app.request('/callback?code=some-code');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /token', () => {
    function makePkce() {
      const verifier = 'test-code-verifier-value-here';
      const challenge = createHash('sha256')
        .update(verifier)
        .digest('base64url');
      return { verifier, challenge };
    }

    it('exchanges authorization code for opaque MCP tokens', async () => {
      const { verifier, challenge } = makePkce();

      store.registerClient({
        client_id: 'c1',
        client_secret: 's1',
        client_id_issued_at: 0,
        client_secret_expires_at: 0,
        redirect_uris: ['https://client.example.com/cb'],
      });

      store.storeAuthCode('mcp-code-1', {
        mcpClientId: 'c1',
        backlogTokens: {
          access_token: 'bl-at',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'bl-rt',
        },
        codeChallenge: challenge,
        redirectUri: 'https://client.example.com/cb',
        expiresAt: Date.now() + 600_000,
      });

      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: 'c1',
        client_secret: 's1',
        code: 'mcp-code-1',
        code_verifier: verifier,
        redirect_uri: 'https://client.example.com/cb',
      });

      const res = await app.request('/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.access_token).toBeDefined();
      expect(json.refresh_token).toBeDefined();
      // Opaque tokens must NOT be the raw Backlog tokens
      expect(json.access_token).not.toBe('bl-at');
      expect(json.refresh_token).not.toBe('bl-rt');
      expect(json.token_type).toBe('bearer');
      expect(json.expires_in).toBe(3600);
    });

    it('rejects mismatched resource in token exchange', async () => {
      const { verifier, challenge } = makePkce();

      store.registerClient({
        client_id: 'c1',
        client_secret: 's1',
        client_id_issued_at: 0,
        client_secret_expires_at: 0,
        redirect_uris: ['https://client.example.com/cb'],
      });

      store.storeAuthCode('mcp-code-res', {
        mcpClientId: 'c1',
        backlogTokens: {
          access_token: 'bl-at',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'bl-rt',
        },
        codeChallenge: challenge,
        redirectUri: 'https://client.example.com/cb',
        resource: 'https://mcp.example.com/mcp',
        expiresAt: Date.now() + 600_000,
      });

      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: 'c1',
        client_secret: 's1',
        code: 'mcp-code-res',
        code_verifier: verifier,
        resource: 'https://wrong.example.com/mcp',
      });

      const res = await app.request('/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('invalid_grant');
      expect(json.error_description).toContain('resource');
    });

    it('rejects expired refresh token', async () => {
      store.registerClient({
        client_id: 'c1',
        client_secret: 's1',
        client_id_issued_at: 0,
        client_secret_expires_at: 0,
        redirect_uris: ['https://client.example.com/cb'],
      });

      store.storeMcpRefreshToken('mcp-refresh-exp', {
        backlogRefreshToken: 'bl-refresh',
        clientId: 'c1',
        expiresAt: Date.now() - 1000,
      });

      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: 'c1',
        client_secret: 's1',
        refresh_token: 'mcp-refresh-exp',
      });

      const res = await app.request('/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('invalid_grant');
    });

    it('rejects invalid code_verifier', async () => {
      store.registerClient({
        client_id: 'c1',
        client_secret: 's1',
        client_id_issued_at: 0,
        client_secret_expires_at: 0,
        redirect_uris: ['https://client.example.com/cb'],
      });

      store.storeAuthCode('mcp-code-2', {
        mcpClientId: 'c1',
        backlogTokens: {
          access_token: 'at',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'rt',
        },
        codeChallenge: 'correct-challenge',
        redirectUri: 'https://client.example.com/cb',
        expiresAt: Date.now() + 600_000,
      });

      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: 'c1',
        client_secret: 's1',
        code: 'mcp-code-2',
        code_verifier: 'wrong-verifier',
      });

      const res = await app.request('/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('invalid_grant');
    });

    it('refreshes a token and returns new opaque MCP tokens', async () => {
      store.registerClient({
        client_id: 'c1',
        client_secret: 's1',
        client_id_issued_at: 0,
        client_secret_expires_at: 0,
        redirect_uris: ['https://client.example.com/cb'],
      });

      store.storeMcpRefreshToken('mcp-refresh-1', {
        backlogRefreshToken: 'bl-refresh',
        clientId: 'c1',
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });

      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: 'c1',
        client_secret: 's1',
        refresh_token: 'mcp-refresh-1',
      });

      const res = await app.request('/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.access_token).toBeDefined();
      expect(json.refresh_token).toBeDefined();
      expect(json.access_token).not.toBe('bl-new-access');
      expect(json.refresh_token).not.toBe('bl-new-refresh');
    });

    it('rejects invalid refresh token', async () => {
      store.registerClient({
        client_id: 'c1',
        client_id_issued_at: 0,
        client_secret_expires_at: 0,
        redirect_uris: ['https://client.example.com/cb'],
      });

      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: 'c1',
        refresh_token: 'unknown-refresh',
      });

      const res = await app.request('/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('invalid_grant');
    });

    it('rejects refresh token issued to different client', async () => {
      store.registerClient({
        client_id: 'c1',
        client_id_issued_at: 0,
        client_secret_expires_at: 0,
        redirect_uris: ['https://client.example.com/cb'],
      });

      store.storeMcpRefreshToken('mcp-refresh-2', {
        backlogRefreshToken: 'bl-refresh',
        clientId: 'other-client',
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });

      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: 'c1',
        refresh_token: 'mcp-refresh-2',
      });

      const res = await app.request('/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      expect(res.status).toBe(400);
    });

    it('restores refresh token when upstream refresh fails', async () => {
      const { refreshBacklogToken } = await import('./backlogOAuthClient.js');
      (refreshBacklogToken as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Backlog 503')
      );

      store.registerClient({
        client_id: 'c1',
        client_secret: 's1',
        client_id_issued_at: 0,
        client_secret_expires_at: 0,
        redirect_uris: ['https://client.example.com/cb'],
      });

      store.storeMcpRefreshToken('mcp-refresh-retry', {
        backlogRefreshToken: 'bl-refresh',
        clientId: 'c1',
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });

      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: 'c1',
        client_secret: 's1',
        refresh_token: 'mcp-refresh-retry',
      });

      const res = await app.request('/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      expect(res.status).toBe(503);

      // Refresh token should be restored for retry
      const restored = store.consumeMcpRefreshToken('mcp-refresh-retry');
      expect(restored).toBeDefined();
      expect(restored!.backlogRefreshToken).toBe('bl-refresh');
    });

    it('rejects unsupported grant_type', async () => {
      store.registerClient({
        client_id: 'c1',
        client_id_issued_at: 0,
        client_secret_expires_at: 0,
        redirect_uris: ['https://client.example.com/cb'],
      });

      const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: 'c1',
      });

      const res = await app.request('/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('unsupported_grant_type');
    });
  });
});
