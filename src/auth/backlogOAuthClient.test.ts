// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BacklogTokenError,
  buildBacklogAuthorizationUrl,
  isGrantGone,
  isTokenRejected,
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
      exchangeBacklogCode(
        config,
        'bad-code',
        'https://mcp.example.com/callback'
      )
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

  // The status is what tells a revoked grant from a Backlog that is merely
  // down, and `/token` answers `invalid_grant` or `server_error` on it. Carried
  // in the message alone the caller would have to parse prose to decide.
  it('carries the upstream status on a rejection', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{"error":"invalid_grant"}', { status: 400 })
    );

    await expect(refreshBacklogToken(config, 'revoked')).rejects.toMatchObject({
      name: 'BacklogTokenError',
      status: 400,
    });
  });

  it('leaves the status absent when Backlog cannot be reached', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new TypeError('fetch failed')
    );

    const err = await refreshBacklogToken(config, 'rt').catch(
      (e: unknown) => e
    );

    expect(err).toBeInstanceOf(BacklogTokenError);
    expect((err as BacklogTokenError).status).toBeUndefined();
  });

  // The status cannot separate these two, and they ask `/token` for opposite
  // answers: a dead grant means re-authorize, a rejected client secret is the
  // operator's problem and re-authorizing would fail the same way.
  it.each([
    ['invalid_grant', 400],
    ['invalid_client', 401],
  ])('reads %s out of the response body', async (code, status) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: code }), { status })
    );

    await expect(refreshBacklogToken(config, 'rt')).rejects.toMatchObject({
      status,
      errorCode: code,
    });
  });

  // A proxy or a WAF can answer the token endpoint with HTML. The status and
  // the raw text are already in the message, so there is nothing to recover.
  it('leaves the error code absent when the body is not an OAuth error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html>Gateway Timeout</html>', { status: 504 })
    );

    const err = await refreshBacklogToken(config, 'rt').catch(
      (e: unknown) => e
    );

    expect((err as BacklogTokenError).status).toBe(504);
    expect((err as BacklogTokenError).errorCode).toBeUndefined();
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

    const result = await verifyBacklogToken(
      'example.backlog.com',
      'valid-token'
    );
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

  it('carries the upstream status on a rejection', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Unauthorized', { status: 401 })
    );

    await expect(
      verifyBacklogToken('example.backlog.com', 'bad-token')
    ).rejects.toMatchObject({ name: 'BacklogTokenError', status: 401 });
  });

  it('leaves the status absent when Backlog cannot be reached', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new TypeError('fetch failed')
    );

    const err = await verifyBacklogToken('example.backlog.com', 'token').catch(
      (e: unknown) => e
    );

    expect(err).toBeInstanceOf(BacklogTokenError);
    expect((err as BacklogTokenError).status).toBeUndefined();
  });
});

// Exported from `src/lib.ts`, so a consumer hosting the same flow branches on
// these instead of reimplementing the rules. Worth pinning directly: reading
// `invalid_client` as a dead grant costs every client a pointless
// authorization, and reading an outage as a rejection costs a live grant.
describe('isGrantGone', () => {
  it.each([
    [
      'an explicit invalid_grant',
      new BacklogTokenError('m', 400, 'invalid_grant'),
    ],
    ['a bare 400 with no readable code', new BacklogTokenError('m', 400)],
  ])('is true for %s', (_label, err) => {
    expect(isGrantGone(err)).toBe(true);
  });

  it.each([
    ['invalid_client', new BacklogTokenError('m', 401, 'invalid_client')],
    ['a 5xx', new BacklogTokenError('m', 503)],
    ['an unreachable Backlog', new BacklogTokenError('m')],
    ['an error of another type', new Error('boom')],
  ])('is false for %s', (_label, err) => {
    expect(isGrantGone(err)).toBe(false);
  });
});

describe('isTokenRejected', () => {
  it.each([
    ['a 401', new BacklogTokenError('m', 401)],
    ['a 403', new BacklogTokenError('m', 403)],
  ])('is true for %s', (_label, err) => {
    expect(isTokenRejected(err)).toBe(true);
  });

  it.each([
    ['a 500', new BacklogTokenError('m', 500)],
    ['an unreachable Backlog', new BacklogTokenError('m')],
    ['an error of another type', new Error('boom')],
  ])('is false for %s', (_label, err) => {
    expect(isTokenRejected(err)).toBe(false);
  });
});
