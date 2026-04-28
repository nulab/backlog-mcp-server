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

  it('passes through with valid cached verification', async () => {
    store.cacheVerification(
      'cached-token',
      { token: 'cached-token', clientId: '1', scopes: [], expiresAt: 0 },
      300_000
    );

    const res = await app.request('/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer cached-token' },
    });
    expect(res.status).toBe(200);
    expect(vi.mocked(verifyBacklogToken)).not.toHaveBeenCalled();
  });

  it('verifies token against Backlog API when not cached', async () => {
    vi.mocked(verifyBacklogToken).mockResolvedValue({
      id: 42,
      userId: 'user42',
      name: 'Test User',
    });

    const res = await app.request('/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer fresh-token' },
    });
    expect(res.status).toBe(200);
    expect(verifyBacklogToken).toHaveBeenCalledWith(
      'example.backlog.com',
      'fresh-token'
    );
  });

  it('returns 401 when token verification fails', async () => {
    vi.mocked(verifyBacklogToken).mockRejectedValue(new Error('invalid'));

    const res = await app.request('/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer bad-token' },
    });
    expect(res.status).toBe(401);
  });
});
