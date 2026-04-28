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
      expect(body.registration_endpoint).toBe('https://mcp.example.com/register');
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
    it('registers a client', async () => {
      const res = await app.request('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redirect_uris: ['http://localhost:9999/callback'],
          client_name: 'test',
        }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.client_id).toBeDefined();
      expect(body.redirect_uris).toEqual(['http://localhost:9999/callback']);
      expect(body.client_name).toBe('test');
    });

    it('rejects missing redirect_uris', async () => {
      const res = await app.request('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /authorize', () => {
    it('rejects unknown client_id', async () => {
      const res = await app.request(
        '/authorize?client_id=unknown&redirect_uri=http://x&response_type=code&code_challenge=ch&code_challenge_method=S256'
      );
      expect(res.status).toBe(400);
    });

    it('redirects to Backlog OAuth for valid request', async () => {
      store.registerClient({
        client_id: 'c1',
        client_id_issued_at: 0,
        client_secret_expires_at: 0,
        redirect_uris: ['http://localhost/cb'],
      });

      const res = await app.request(
        '/authorize?client_id=c1&redirect_uri=http://localhost/cb&response_type=code&code_challenge=test-challenge&code_challenge_method=S256&state=my-state',
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
        redirect_uris: ['http://localhost/cb'],
      });

      const res = await app.request(
        '/authorize?client_id=c1&redirect_uri=http://evil.com/cb&response_type=code&code_challenge=ch&code_challenge_method=S256'
      );
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

    it('exchanges authorization code for tokens', async () => {
      const { verifier, challenge } = makePkce();

      store.registerClient({
        client_id: 'c1',
        client_secret: 's1',
        client_id_issued_at: 0,
        client_secret_expires_at: 0,
        redirect_uris: ['http://localhost/cb'],
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
        redirectUri: 'http://localhost/cb',
        expiresAt: Date.now() + 600_000,
      });

      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: 'c1',
        client_secret: 's1',
        code: 'mcp-code-1',
        code_verifier: verifier,
        redirect_uri: 'http://localhost/cb',
      });

      const res = await app.request('/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.access_token).toBe('bl-at');
      expect(json.refresh_token).toBe('bl-rt');
    });

    it('rejects invalid code_verifier', async () => {
      store.registerClient({
        client_id: 'c1',
        client_secret: 's1',
        client_id_issued_at: 0,
        client_secret_expires_at: 0,
        redirect_uris: ['http://localhost/cb'],
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
        redirectUri: 'http://localhost/cb',
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

    it('refreshes a token', async () => {
      store.registerClient({
        client_id: 'c1',
        client_secret: 's1',
        client_id_issued_at: 0,
        client_secret_expires_at: 0,
        redirect_uris: ['http://localhost/cb'],
      });

      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: 'c1',
        client_secret: 's1',
        refresh_token: 'bl-refresh',
      });

      const res = await app.request('/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.access_token).toBe('bl-new-access');
    });

    it('rejects unsupported grant_type', async () => {
      store.registerClient({
        client_id: 'c1',
        client_id_issued_at: 0,
        client_secret_expires_at: 0,
        redirect_uris: ['http://localhost/cb'],
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
