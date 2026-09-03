// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';
import { createOAuthRoutes } from './oauthRoutes.js';
import { createTokenStore, type TokenStore } from './tokenStore.js';
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
    store = createTokenStore();
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
      expect(body.authorization_response_iss_parameter_supported).toBe(true);
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

    describe('application_type', () => {
      const register = (body: Record<string, unknown>) =>
        app.request('/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

      it('lets a native client use a loopback redirect_uri', async () => {
        const res = await register({
          application_type: 'native',
          redirect_uris: ['http://localhost:9999/callback'],
        });

        expect(res.status).toBe(201);
      });

      it('lets a web client use an https redirect_uri', async () => {
        const res = await register({
          application_type: 'web',
          redirect_uris: ['https://client.example.com/callback'],
        });

        expect(res.status).toBe(201);
      });

      it('refuses a loopback redirect_uri from a web client', async () => {
        const res = await register({
          application_type: 'web',
          redirect_uris: ['http://localhost:9999/callback'],
        });

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toBe('invalid_client_metadata');
        expect(body.error_description).toContain('loopback');
      });

      it('treats an all-loopback registration as native when undeclared', async () => {
        // Local MCP clients do not send application_type. RFC 7591 would default
        // them to `web` and reject them; a set of redirect URIs that is entirely
        // loopback can only be a client on the user's machine.
        const res = await register({
          redirect_uris: [
            'http://localhost:9999/callback',
            'http://127.0.0.1:8888/callback',
          ],
        });

        expect(res.status).toBe(201);
      });

      it('refuses an undeclared registration that mixes https and loopback', async () => {
        // The inference above must not become the way around the check: something
        // that can serve a redirect on its own domain has no need to also collect
        // codes on the user's machine.
        const res = await register({
          redirect_uris: [
            'https://client.example.com/callback',
            'http://localhost:9999/callback',
          ],
        });

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toBe('invalid_client_metadata');
        expect(body.error_description).toContain(
          'http://localhost:9999/callback'
        );
      });

      it('still lets a declared native client claim an https redirect_uri too', async () => {
        // RFC 8252 allows a native app a claimed https URI alongside loopback.
        const res = await register({
          application_type: 'native',
          redirect_uris: [
            'https://client.example.com/callback',
            'http://localhost:9999/callback',
          ],
        });

        expect(res.status).toBe(201);
      });

      it('treats a null application_type as not declared', async () => {
        // Serialisers that emit null for an absent optional field are common,
        // and this registration is accepted today.
        const res = await register({
          application_type: null,
          redirect_uris: ['http://localhost:9999/callback'],
        });

        expect(res.status).toBe(201);
      });

      it('recognises the IPv6 loopback as loopback', async () => {
        const res = await register({
          redirect_uris: ['http://[::1]:9999/callback'],
        });

        expect(res.status).toBe(201);
      });

      it('rejects an application_type it does not define', async () => {
        const res = await register({
          application_type: 'browser',
          redirect_uris: ['https://client.example.com/callback'],
        });

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toBe('invalid_client_metadata');
        expect(body.error_description).toContain('application_type');
      });
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
      expect(location).toContain('iss=https%3A%2F%2Fmcp.example.com');
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
      expect(location).toContain('iss=https%3A%2F%2Fmcp.example.com');
    });

    it('includes the RFC 9207 iss parameter on a successful redirect', async () => {
      store.registerClient({
        client_id: 'c1',
        client_id_issued_at: 0,
        client_secret_expires_at: 0,
        redirect_uris: ['https://client.example.com/cb'],
      });

      store.storePendingAuth('bl-state-ok', {
        mcpClientId: 'c1',
        codeChallenge: 'ch',
        redirectUri: 'https://client.example.com/cb',
        scopes: [],
        state: 'mcp-state-ok',
        createdAt: Date.now(),
      });

      const res = await app.request(
        '/callback?code=bl-code&state=bl-state-ok',
        {
          redirect: 'manual',
        }
      );
      expect(res.status).toBe(302);
      const location = new URL(res.headers.get('location')!);
      expect(location.searchParams.get('iss')).toBe('https://mcp.example.com');
      expect(location.searchParams.get('state')).toBe('mcp-state-ok');
      expect(location.searchParams.get('code')).toBeTruthy();
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

    // Backlog counts `expires_in` from the moment it answered at `/callback`,
    // not from whenever the client gets round to redeeming the code. Re-basing
    // it at `/token` hands out an expiry later than the real one, which is how
    // a spent Backlog token ends up behind a token this server calls live.
    it('does not re-base the Backlog expiry when the code is redeemed later', async () => {
      const { verifier, challenge } = makePkce();
      const REDEEM_DELAY_MS = 120_000;

      store.registerClient({
        client_id: 'c1',
        client_secret: 's1',
        client_id_issued_at: 0,
        client_secret_expires_at: 0,
        redirect_uris: ['https://client.example.com/cb'],
      });
      store.storePendingAuth('bl-state-drift', {
        mcpClientId: 'c1',
        codeChallenge: challenge,
        redirectUri: 'https://client.example.com/cb',
        scopes: [],
        createdAt: Date.now(),
      });

      vi.useFakeTimers();
      try {
        const callbackAt = Date.now();
        vi.setSystemTime(callbackAt);

        // `exchangeBacklogCode` is mocked to answer `expires_in: 3600`, so the
        // real expiry is fixed at this instant plus an hour.
        const callbackRes = await app.request(
          '/callback?code=bl-code&state=bl-state-drift',
          { redirect: 'manual' }
        );
        const mcpCode = new URL(
          callbackRes.headers.get('location')!
        ).searchParams.get('code')!;
        const realExpiry = callbackAt + 3600 * 1000;

        vi.setSystemTime(callbackAt + REDEEM_DELAY_MS);

        const res = await app.request('/token', {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: 'c1',
            client_secret: 's1',
            code: mcpCode,
            code_verifier: verifier,
            redirect_uri: 'https://client.example.com/cb',
          }).toString(),
        });

        expect(res.status).toBe(200);
        const json = (await res.json()) as {
          access_token: string;
          expires_in: number;
        };

        // What the client is told: what is left, not the original 3600.
        expect(json.expires_in).toBe(3600 - REDEEM_DELAY_MS / 1000);

        // What the server stores: the instant Backlog fixed, unmoved.
        expect(store.getMcpToken(json.access_token)?.expiresAt).toBe(
          realExpiry
        );
      } finally {
        vi.useRealTimers();
      }
    });

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
        backlogAccessTokenExpiresAt: Date.now() + 3600 * 1000,
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
      // The remaining life, so an immediate redemption comes back a second
      // short of the 3600 Backlog reported. The exact arithmetic is pinned by
      // 'does not re-base the Backlog expiry when the code is redeemed later'.
      expect(json.expires_in).toBeLessThanOrEqual(3600);
      expect(json.expires_in).toBeGreaterThan(3590);
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
        backlogAccessTokenExpiresAt: Date.now() + 3600 * 1000,
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
        redirect_uri: 'https://client.example.com/cb',
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

    it('rejects missing redirect_uri in token exchange', async () => {
      const { verifier, challenge } = makePkce();

      store.registerClient({
        client_id: 'c1',
        client_secret: 's1',
        client_id_issued_at: 0,
        client_secret_expires_at: 0,
        redirect_uris: ['https://client.example.com/cb'],
      });

      store.storeAuthCode('mcp-code-no-redir', {
        mcpClientId: 'c1',
        backlogTokens: {
          access_token: 'bl-at',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'bl-rt',
        },
        backlogAccessTokenExpiresAt: Date.now() + 3600 * 1000,
        codeChallenge: challenge,
        redirectUri: 'https://client.example.com/cb',
        expiresAt: Date.now() + 600_000,
      });

      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: 'c1',
        client_secret: 's1',
        code: 'mcp-code-no-redir',
        code_verifier: verifier,
      });

      const res = await app.request('/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('invalid_grant');
      expect(json.error_description).toContain('redirect_uri');
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
        backlogAccessTokenExpiresAt: Date.now() + 3600 * 1000,
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
