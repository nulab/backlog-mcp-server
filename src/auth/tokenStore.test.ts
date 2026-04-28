// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TokenStore } from './tokenStore.js';

describe('TokenStore', () => {
  let store: TokenStore;

  beforeEach(() => {
    store = new TokenStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('pendingAuth', () => {
    it('stores and consumes a pending authorization', () => {
      const pending = {
        mcpClientId: 'client-1',
        codeChallenge: 'challenge',
        redirectUri: 'http://localhost/callback',
        scopes: [],
        createdAt: Date.now(),
      };
      store.storePendingAuth('state-1', pending);
      const result = store.consumePendingAuth('state-1');
      expect(result).toEqual(pending);
    });

    it('returns undefined for unknown state', () => {
      expect(store.consumePendingAuth('unknown')).toBeUndefined();
    });

    it('consumes only once', () => {
      store.storePendingAuth('state-1', {
        mcpClientId: 'c',
        codeChallenge: 'ch',
        redirectUri: 'http://x',
        scopes: [],
        createdAt: Date.now(),
      });
      store.consumePendingAuth('state-1');
      expect(store.consumePendingAuth('state-1')).toBeUndefined();
    });

    it('returns undefined for expired pending auth', () => {
      store.storePendingAuth('state-1', {
        mcpClientId: 'c',
        codeChallenge: 'ch',
        redirectUri: 'http://x',
        scopes: [],
        createdAt: Date.now(),
      });
      vi.advanceTimersByTime(11 * 60 * 1000);
      expect(store.consumePendingAuth('state-1')).toBeUndefined();
    });
  });

  describe('authCode', () => {
    it('stores and consumes an authorization code', () => {
      const entry = {
        mcpClientId: 'c',
        backlogTokens: {
          access_token: 'at',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'rt',
        },
        codeChallenge: 'ch',
        redirectUri: 'http://x',
        expiresAt: Date.now() + 600_000,
      };
      store.storeAuthCode('code-1', entry);
      expect(store.consumeAuthCode('code-1')).toEqual(entry);
    });

    it('returns undefined for expired code', () => {
      store.storeAuthCode('code-1', {
        mcpClientId: 'c',
        backlogTokens: {
          access_token: 'at',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'rt',
        },
        codeChallenge: 'ch',
        redirectUri: 'http://x',
        expiresAt: Date.now() + 600_000,
      });
      vi.advanceTimersByTime(11 * 60 * 1000);
      expect(store.consumeAuthCode('code-1')).toBeUndefined();
    });
  });

  describe('clients', () => {
    it('registers and retrieves a client', () => {
      const client = {
        client_id: 'c1',
        client_id_issued_at: 0,
        client_secret_expires_at: 0,
        redirect_uris: ['http://x'],
      };
      store.registerClient(client);
      expect(store.getClient('c1')).toEqual(client);
    });

    it('returns undefined for unknown client', () => {
      expect(store.getClient('unknown')).toBeUndefined();
    });
  });

  describe('verificationCache', () => {
    it('caches and retrieves verification', () => {
      const authInfo = { token: 't', clientId: '1', scopes: [], expiresAt: 0 };
      store.cacheVerification('token-1', authInfo, 300_000);
      expect(store.getCachedVerification('token-1')).toEqual(authInfo);
    });

    it('returns undefined for expired cache entry', () => {
      const authInfo = { token: 't', clientId: '1', scopes: [], expiresAt: 0 };
      store.cacheVerification('token-1', authInfo, 300_000);
      vi.advanceTimersByTime(301_000);
      expect(store.getCachedVerification('token-1')).toBeUndefined();
    });
  });

  describe('cleanup', () => {
    it('removes expired entries', () => {
      store.storePendingAuth('s1', {
        mcpClientId: 'c',
        codeChallenge: 'ch',
        redirectUri: 'http://x',
        scopes: [],
        createdAt: Date.now(),
      });
      store.storeAuthCode('code-1', {
        mcpClientId: 'c',
        backlogTokens: {
          access_token: 'at',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'rt',
        },
        codeChallenge: 'ch',
        redirectUri: 'http://x',
        expiresAt: Date.now() + 600_000,
      });
      store.cacheVerification(
        'token-1',
        { token: 't', clientId: '1', scopes: [], expiresAt: 0 },
        300_000
      );

      vi.advanceTimersByTime(11 * 60 * 1000);
      store.cleanup();

      expect(store.consumePendingAuth('s1')).toBeUndefined();
      expect(store.consumeAuthCode('code-1')).toBeUndefined();
      expect(store.getCachedVerification('token-1')).toBeUndefined();
    });
  });
});
