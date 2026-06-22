// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createDurableTokenStore,
  type KeyValueStorage,
} from './durableTokenStore.js';
import type { TokenStore } from './tokenStore.js';

/**
 * In-memory fake of the Durable Object storage KV API, used to assert that
 * mutations are written through and that a fresh store rehydrates from them.
 */
function createFakeStorage(): KeyValueStorage & { dump: Map<string, unknown> } {
  const data = new Map<string, unknown>();
  return {
    dump: data,
    async list<T = unknown>(options?: { prefix?: string }): Promise<Map<string, T>> {
      const prefix = options?.prefix ?? '';
      const result = new Map<string, T>();
      for (const [key, value] of data) {
        if (key.startsWith(prefix)) result.set(key, value as T);
      }
      return result;
    },
    async put(key: string, value: unknown): Promise<void> {
      data.set(key, value);
    },
    async delete(key: string): Promise<boolean> {
      return data.delete(key);
    },
  };
}

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe('createDurableTokenStore', () => {
  let storage: ReturnType<typeof createFakeStorage>;
  let store: TokenStore;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    storage = createFakeStorage();
    store = await createDurableTokenStore(storage);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('保留中の認可をストレージに書き込み、consumeで削除する', async () => {
    const pending = {
      mcpClientId: 'client-1',
      codeChallenge: 'challenge',
      redirectUri: 'http://localhost/callback',
      scopes: [],
      createdAt: Date.now(),
    };

    store.storePendingAuth('state-1', pending);
    await flush();
    expect(storage.dump.get('pending:state-1')).toEqual(pending);

    const result = store.consumePendingAuth('state-1');
    await flush();
    expect(result).toEqual(pending);
    expect(storage.dump.has('pending:state-1')).toBe(false);
  });

  it('登録済みクライアントは新しいストアで再水和される', async () => {
    const client = {
      client_id: 'c1',
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_secret_expires_at: 0,
      redirect_uris: ['http://localhost'],
    };
    store.registerClient(client);
    await flush();

    // Act: rebuild the store from the same persisted storage.
    const rehydrated = await createDurableTokenStore(storage);

    // Assert: the client survives the rebuild.
    expect(rehydrated.getClient('c1')).toEqual(client);
  });

  it('MCPトークンとリフレッシュトークンを永続化し再水和する', async () => {
    store.storeMcpToken('mcp-t1', {
      backlogAccessToken: 'bl-at',
      clientId: 'c1',
      expiresAt: Date.now() + 3_600_000,
    });
    store.storeMcpRefreshToken('mcp-rt1', {
      backlogRefreshToken: 'bl-rt',
      clientId: 'c1',
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });
    await flush();

    const rehydrated = await createDurableTokenStore(storage);

    expect(rehydrated.getMcpToken('mcp-t1')?.backlogAccessToken).toBe('bl-at');
    expect(rehydrated.consumeMcpRefreshToken('mcp-rt1')?.backlogRefreshToken).toBe(
      'bl-rt'
    );
  });

  it('期限切れのMCPトークンはメモリとストレージ双方から除去される', async () => {
    store.storeMcpToken('mcp-t1', {
      backlogAccessToken: 'bl-at',
      clientId: 'c1',
      expiresAt: Date.now() + 3_600_000,
    });
    await flush();

    vi.advanceTimersByTime(3_601_000);

    expect(store.getMcpToken('mcp-t1')).toBeUndefined();
    await flush();
    expect(storage.dump.has('mcptoken:mcp-t1')).toBe(false);
  });

  it('cleanupで期限切れエントリをストレージから削除する', async () => {
    store.storePendingAuth('s1', {
      mcpClientId: 'c',
      codeChallenge: 'ch',
      redirectUri: 'http://localhost',
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
      redirectUri: 'http://localhost',
      expiresAt: Date.now() + 600_000,
    });
    await flush();

    vi.advanceTimersByTime(11 * 60 * 1000);
    store.cleanup();
    await flush();

    expect(storage.dump.has('pending:s1')).toBe(false);
    expect(storage.dump.has('authcode:code-1')).toBe(false);
    expect(store.consumePendingAuth('s1')).toBeUndefined();
    expect(store.consumeAuthCode('code-1')).toBeUndefined();
  });

  it('検証キャッシュはメモリのみで永続化しない', async () => {
    store.cacheVerification(
      'token-1',
      { token: 't', clientId: '1', scopes: [], expiresAt: 0 },
      300_000
    );
    await flush();

    expect(store.getCachedVerification('token-1')).toBeDefined();
    // No storage key should be written for the volatile cache.
    expect([...storage.dump.keys()].some((k) => k.includes('token-1'))).toBe(
      false
    );
  });
});
