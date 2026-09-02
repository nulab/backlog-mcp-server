// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createBearerAuthMiddleware } from './bearerAuthMiddleware.js';
import { reportBacklogAuthError } from './backlogAuthContext.js';
import { createTokenStore } from './tokenStore.js';
import type { BacklogOAuthConfig } from './backlogOAuthConfig.js';

vi.mock('./backlogOAuthClient.js', () => ({
  verifyBacklogToken: vi.fn(),
}));

import { verifyBacklogToken } from './backlogOAuthClient.js';

const config: BacklogOAuthConfig = {
  clientId: 'cid',
  clientSecret: 'csecret',
  backlogDomain: 'example.backlog.com',
  serverBaseUrl: 'https://mcp.example.com',
};

describe('createBearerAuthMiddleware', () => {
  let store: ReturnType<typeof createTokenStore>;
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    store = createTokenStore();
    app = new Hono();
    app.use('/mcp', createBearerAuthMiddleware(store, config, '/mcp'));
    app.post('/mcp', (c) => c.json({ ok: true }));
  });

  it('returns 401 when Authorization header is missing', async () => {
    const res = await app.request('/mcp', { method: 'POST' });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('invalid_token');
    expect(res.headers.get('www-authenticate')).toContain('resource_metadata');
  });

  it('returns 401 for non-Bearer auth', async () => {
    const res = await app.request('/mcp', {
      method: 'POST',
      headers: { Authorization: 'Basic abc123' },
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 for unknown MCP token', async () => {
    const res = await app.request('/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer unknown-mcp-token' },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error_description).toContain('Unknown or expired');
  });

  it('passes through with valid cached verification', async () => {
    store.storeMcpToken('mcp-token-1', {
      backlogAccessToken: 'bl-token-1',
      clientId: 'c1',
      expiresAt: Date.now() + 3600_000,
    });
    store.cacheVerification(
      'mcp-token-1',
      { token: 'bl-token-1', clientId: '1', scopes: [], expiresAt: 0 },
      300_000
    );

    const res = await app.request('/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer mcp-token-1' },
    });
    expect(res.status).toBe(200);
    expect(vi.mocked(verifyBacklogToken)).not.toHaveBeenCalled();
  });

  it('verifies Backlog token when MCP token is valid but not cached', async () => {
    store.storeMcpToken('mcp-token-2', {
      backlogAccessToken: 'bl-token-2',
      clientId: 'c1',
      expiresAt: Date.now() + 3600_000,
    });

    vi.mocked(verifyBacklogToken).mockResolvedValue({
      id: 42,
      userId: 'user42',
      name: 'Test User',
    });

    const res = await app.request('/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer mcp-token-2' },
    });
    expect(res.status).toBe(200);
    expect(verifyBacklogToken).toHaveBeenCalledWith(
      'example.backlog.com',
      'bl-token-2'
    );
  });

  it('returns 401 when Backlog token verification fails', async () => {
    store.storeMcpToken('mcp-token-3', {
      backlogAccessToken: 'bl-bad-token',
      clientId: 'c1',
      expiresAt: Date.now() + 3600_000,
    });

    vi.mocked(verifyBacklogToken).mockRejectedValue(new Error('invalid'));

    const res = await app.request('/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer mcp-token-3' },
    });
    expect(res.status).toBe(401);
  });

  // Regression for a Backlog 401 arriving as tool output over transport 200:
  // the client sees a healthy connection and is never told to re-authenticate.
  describe('when a downstream Backlog call reports an auth error', () => {
    let failing: Hono;

    beforeEach(() => {
      failing = new Hono();
      failing.use('/mcp', createBearerAuthMiddleware(store, config, '/mcp'));
      failing.post('/mcp', (c) => {
        reportBacklogAuthError();
        return c.json({ ok: true });
      });

      store.storeMcpToken('mcp-token-live', {
        backlogAccessToken: 'bl-token-live',
        clientId: 'c1',
        expiresAt: Date.now() + 3600_000,
      });
      store.cacheVerification(
        'mcp-token-live',
        { token: 'bl-token-live', clientId: '1', scopes: [], expiresAt: 0 },
        300_000
      );
    });

    const call = (app: Hono) =>
      app.request('/mcp', {
        method: 'POST',
        headers: { Authorization: 'Bearer mcp-token-live' },
      });

    it('replaces the tool result with 401 and WWW-Authenticate', async () => {
      const res = await call(failing);

      expect(res.status).toBe(401);
      expect(res.headers.get('www-authenticate')).toContain(
        'resource_metadata'
      );
      const body = await res.json();
      expect(body.error).toBe('invalid_token');
    });

    it('revokes the MCP token and its cached verification', async () => {
      await call(failing);

      expect(store.getMcpToken('mcp-token-live')).toBeUndefined();
      expect(store.getCachedVerification('mcp-token-live')).toBeUndefined();
    });

    // The revocation, not the rewritten response, is what makes this
    // recoverable: a response that upgraded to SSE has already been sent.
    it('answers the next request on the same token with 401', async () => {
      await call(failing);
      const res = await call(app);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error_description).toContain('Unknown or expired');
    });

    it('leaves a request that reported nothing untouched', async () => {
      const res = await call(app);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
      expect(store.getMcpToken('mcp-token-live')).toMatchObject({
        backlogAccessToken: 'bl-token-live',
      });
    });
  });
});
