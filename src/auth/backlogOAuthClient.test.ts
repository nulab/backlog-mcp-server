// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildBacklogAuthorizationUrl,
  exchangeBacklogCode,
  refreshBacklogToken,
  verifyBacklogToken,
} from './backlogOAuthClient.js';
import type { BacklogOAuthConfig } from './backlogOAuthConfig.js';

const config: BacklogOAuthConfig = {
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  backlogDomain: 'example.backlog.com',
  serverBaseUrl: 'https://mcp.example.com',
};

describe('buildBacklogAuthorizationUrl', () => {
  it('builds a correct Backlog authorization URL', () => {
    const url = buildBacklogAuthorizationUrl(
      config,
      'https://mcp.example.com/callback',
      'state-123'
    );
    const parsed = new URL(url);
    expect(parsed.origin).toBe('https://example.backlog.com');
    expect(parsed.pathname).toBe('/OAuth2AccessRequest.action');
    expect(parsed.searchParams.get('response_type')).toBe('code');
    expect(parsed.searchParams.get('client_id')).toBe('test-client-id');
    expect(parsed.searchParams.get('redirect_uri')).toBe(
      'https://mcp.example.com/callback'
    );
    expect(parsed.searchParams.get('state')).toBe('state-123');
  });
});

describe('exchangeBacklogCode', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('exchanges an authorization code for tokens', async () => {
    const mockTokens = {
      access_token: 'access-123',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'refresh-123',
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockTokens), { status: 200 })
    );

    const result = await exchangeBacklogCode(
      config,
      'auth-code-456',
      'https://mcp.example.com/callback'
    );

    expect(result).toEqual(mockTokens);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://example.backlog.com/api/v2/oauth2/token',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('throws when Backlog returns an error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Bad Request', { status: 400 })
    );

    await expect(
      exchangeBacklogCode(config, 'bad-code', 'https://mcp.example.com/callback')
    ).rejects.toThrow('Backlog token exchange failed (400)');
  });
});

describe('refreshBacklogToken', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('refreshes a token', async () => {
    const mockTokens = {
      access_token: 'new-access',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'new-refresh',
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockTokens), { status: 200 })
    );

    const result = await refreshBacklogToken(config, 'old-refresh-token');
    expect(result).toEqual(mockTokens);
  });

  it('throws when refresh fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Unauthorized', { status: 401 })
    );

    await expect(refreshBacklogToken(config, 'expired')).rejects.toThrow(
      'Backlog token refresh failed (401)'
    );
  });
});

describe('verifyBacklogToken', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns user info for a valid token', async () => {
    const user = { id: 1, userId: 'user1', name: 'Test User' };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(user), { status: 200 })
    );

    const result = await verifyBacklogToken('example.backlog.com', 'valid-token');
    expect(result).toEqual(user);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://example.backlog.com/api/v2/users/myself',
      { headers: { Authorization: 'Bearer valid-token' } }
    );
  });

  it('throws when token is invalid', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Unauthorized', { status: 401 })
    );

    await expect(
      verifyBacklogToken('example.backlog.com', 'bad-token')
    ).rejects.toThrow('Backlog token verification failed (401)');
  });
});
