// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createBearerAuthMiddleware } from './bearerAuthMiddleware.js';
import { TokenStore } from './tokenStore.js';
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
  let store: TokenStore;
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new TokenStore();
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
});
