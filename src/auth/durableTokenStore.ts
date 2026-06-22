// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { logger } from '../utils/logger.js';
import {
  CLIENT_TTL_MS,
  MAX_CLIENTS,
  PENDING_AUTH_TTL_MS,
  type AuthCodeEntry,
  type McpRefreshEntry,
  type McpTokenEntry,
  type OAuthClientInfo,
  type PendingAuthorization,
  type TokenStore,
} from './tokenStore.js';

/**
 * Minimal key/value storage contract satisfied by `DurableObjectStorage`.
 *
 * Declared locally so this module does not depend on `@cloudflare/workers-types`
 * and can be unit-tested with an in-memory fake.
 */
export interface KeyValueStorage {
  list<T = unknown>(options?: { prefix?: string }): Promise<Map<string, T>>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<boolean>;
}

const PREFIX = {
  pending: 'pending:',
  authCode: 'authcode:',
  client: 'client:',
  mcpToken: 'mcptoken:',
  mcpRefresh: 'mcprefresh:',
} as const;

/**
 * Fire-and-forget a storage write, logging (but not throwing on) failures.
 *
 * Durability is guaranteed by the Durable Object output gate, which holds the
 * response until storage writes initiated during the request have completed,
 * so callers do not need to await these promises.
 */
function persist(operation: Promise<unknown>): void {
  operation.catch((err) => {
    logger.error({ err }, 'Failed to persist token store mutation');
  });
}

/**
 * Creates a TokenStore backed by Durable Object storage.
 *
 * All entries are rehydrated into in-memory maps on construction so reads stay
 * synchronous (matching the {@link TokenStore} contract); mutations update the
 * map and write through to storage. The volatile verification cache is kept in
 * memory only, since it is a short-lived optimization that is safe to lose on
 * restart.
 */
export async function createDurableTokenStore(
  storage: KeyValueStorage
): Promise<TokenStore> {
  // Rehydrate every namespace from storage into in-memory maps.
  const pendingAuthorizations = new Map<string, PendingAuthorization>(
    stripPrefix(await storage.list<PendingAuthorization>({ prefix: PREFIX.pending }), PREFIX.pending)
  );
  const authorizationCodes = new Map<string, AuthCodeEntry>(
    stripPrefix(await storage.list<AuthCodeEntry>({ prefix: PREFIX.authCode }), PREFIX.authCode)
  );
  const clients = new Map<string, OAuthClientInfo>(
    stripPrefix(await storage.list<OAuthClientInfo>({ prefix: PREFIX.client }), PREFIX.client)
  );
  const mcpAccessTokens = new Map<string, McpTokenEntry>(
    stripPrefix(await storage.list<McpTokenEntry>({ prefix: PREFIX.mcpToken }), PREFIX.mcpToken)
  );
  const mcpRefreshTokens = new Map<string, McpRefreshEntry>(
    stripPrefix(await storage.list<McpRefreshEntry>({ prefix: PREFIX.mcpRefresh }), PREFIX.mcpRefresh)
  );

  // Verification cache is volatile (not persisted).
  const verificationCache = new Map<
    string,
    { authInfo: AuthInfo; expiresAt: number }
  >();

  const evictOldestClient = (): void => {
    const now = Math.floor(Date.now() / 1000);
    for (const [id, client] of clients) {
      if (now - client.client_id_issued_at > CLIENT_TTL_MS / 1000) {
        clients.delete(id);
        persist(storage.delete(PREFIX.client + id));
        return;
      }
    }
  };

  return {
    storePendingAuth(backlogState, pending): void {
      pendingAuthorizations.set(backlogState, pending);
      persist(storage.put(PREFIX.pending + backlogState, pending));
    },

    consumePendingAuth(backlogState): PendingAuthorization | undefined {
      const entry = pendingAuthorizations.get(backlogState);
      if (!entry) return undefined;
      pendingAuthorizations.delete(backlogState);
      persist(storage.delete(PREFIX.pending + backlogState));
      if (Date.now() - entry.createdAt > PENDING_AUTH_TTL_MS) return undefined;
      return entry;
    },

    storeAuthCode(code, entry): void {
      authorizationCodes.set(code, entry);
      persist(storage.put(PREFIX.authCode + code, entry));
    },

    consumeAuthCode(code): AuthCodeEntry | undefined {
      const entry = authorizationCodes.get(code);
      if (!entry) return undefined;
      authorizationCodes.delete(code);
      persist(storage.delete(PREFIX.authCode + code));
      if (Date.now() > entry.expiresAt) return undefined;
      return entry;
    },

    getClient(clientId): OAuthClientInfo | undefined {
      return clients.get(clientId);
    },

    registerClient(client): boolean {
      if (clients.size >= MAX_CLIENTS) {
        evictOldestClient();
        if (clients.size >= MAX_CLIENTS) return false;
      }
      clients.set(client.client_id, client);
      persist(storage.put(PREFIX.client + client.client_id, client));
      return true;
    },

    getCachedVerification(token): AuthInfo | undefined {
      const cached = verificationCache.get(token);
      if (!cached) return undefined;
      if (Date.now() > cached.expiresAt) {
        verificationCache.delete(token);
        return undefined;
      }
      return cached.authInfo;
    },

    cacheVerification(token, authInfo, ttlMs): void {
      verificationCache.set(token, {
        authInfo,
        expiresAt: Date.now() + ttlMs,
      });
    },

    storeMcpToken(mcpToken, entry): void {
      mcpAccessTokens.set(mcpToken, entry);
      persist(storage.put(PREFIX.mcpToken + mcpToken, entry));
    },

    getMcpToken(mcpToken): McpTokenEntry | undefined {
      const entry = mcpAccessTokens.get(mcpToken);
      if (!entry) return undefined;
      if (Date.now() > entry.expiresAt) {
        mcpAccessTokens.delete(mcpToken);
        persist(storage.delete(PREFIX.mcpToken + mcpToken));
        return undefined;
      }
      return entry;
    },

    storeMcpRefreshToken(mcpRefreshToken, entry): void {
      mcpRefreshTokens.set(mcpRefreshToken, entry);
      persist(storage.put(PREFIX.mcpRefresh + mcpRefreshToken, entry));
    },

    consumeMcpRefreshToken(mcpRefreshToken): McpRefreshEntry | undefined {
      const entry = mcpRefreshTokens.get(mcpRefreshToken);
      if (!entry) return undefined;
      mcpRefreshTokens.delete(mcpRefreshToken);
      persist(storage.delete(PREFIX.mcpRefresh + mcpRefreshToken));
      if (Date.now() > entry.expiresAt) return undefined;
      return entry;
    },

    cleanup(): void {
      const now = Date.now();
      for (const [key, entry] of pendingAuthorizations) {
        if (now - entry.createdAt > PENDING_AUTH_TTL_MS) {
          pendingAuthorizations.delete(key);
          persist(storage.delete(PREFIX.pending + key));
        }
      }
      for (const [key, entry] of authorizationCodes) {
        if (now > entry.expiresAt) {
          authorizationCodes.delete(key);
          persist(storage.delete(PREFIX.authCode + key));
        }
      }
      for (const [key, cached] of verificationCache) {
        if (now > cached.expiresAt) verificationCache.delete(key);
      }
      for (const [key, entry] of mcpAccessTokens) {
        if (now > entry.expiresAt) {
          mcpAccessTokens.delete(key);
          persist(storage.delete(PREFIX.mcpToken + key));
        }
      }
      for (const [key, entry] of mcpRefreshTokens) {
        if (now > entry.expiresAt) {
          mcpRefreshTokens.delete(key);
          persist(storage.delete(PREFIX.mcpRefresh + key));
        }
      }
      const nowSec = Math.floor(now / 1000);
      for (const [key, client] of clients) {
        if (nowSec - client.client_id_issued_at > CLIENT_TTL_MS / 1000) {
          clients.delete(key);
          persist(storage.delete(PREFIX.client + key));
        }
      }
    },
  };
}

/**
 * Re-keys a prefixed storage map into an entries array with the prefix removed,
 * suitable for constructing the in-memory map.
 */
function stripPrefix<T>(
  entries: Map<string, T>,
  prefix: string
): Array<[string, T]> {
  return Array.from(entries, ([key, value]) => [key.slice(prefix.length), value]);
}
