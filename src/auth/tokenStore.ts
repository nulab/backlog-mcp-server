// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import type { AuthInfo } from '@modelcontextprotocol/server';

export type BacklogTokenData = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
};

export type OAuthClientInfo = {
  client_id: string;
  client_secret?: string;
  client_id_issued_at: number;
  client_secret_expires_at: number;
  redirect_uris: string[];
  client_name?: string;
  token_endpoint_auth_method?: string;
  grant_types?: string[];
  response_types?: string[];
};

export type PendingAuthorization = {
  mcpClientId: string;
  codeChallenge: string;
  redirectUri: string;
  resource?: string;
  scopes: string[];
  state?: string;
  createdAt: number;
};

export type AuthCodeEntry = {
  mcpClientId: string;
  backlogTokens: BacklogTokenData;
  codeChallenge: string;
  redirectUri: string;
  resource?: string;
  expiresAt: number;
};

type CachedVerification = {
  authInfo: AuthInfo;
  expiresAt: number;
};

export type McpTokenEntry = {
  backlogAccessToken: string;
  clientId: string;
  expiresAt: number;
};

export type McpRefreshEntry = {
  backlogRefreshToken: string;
  clientId: string;
  expiresAt: number;
};

const PENDING_AUTH_TTL_MS = 10 * 60 * 1000;
const CLIENT_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
const MAX_CLIENTS = 1000;

/**
 * A value a store may return directly or after a round trip.
 *
 * The default store is in-memory and answers synchronously; anything backed by
 * a network — Redis, DynamoDB, a Durable Object — cannot. Widening the contract
 * rather than the implementation keeps the default free of a Promise it has no
 * use for, while letting an external one satisfy the same type.
 */
type Awaitable<T> = T | Promise<T>;

/**
 * The OAuth state this server owns: dynamic client registrations, in-flight
 * authorizations, and the tokens it issues. The MCP SDK ships the
 * resource-server side, so none of this is state it can hold on our behalf.
 *
 * Two obligations an implementation must honour, neither of which the type can
 * express:
 *
 * - `consumePendingAuth`, `consumeAuthCode` and `consumeMcpRefreshToken` must
 *   read and delete atomically. They are single-use by design — an
 *   authorization code replayed against two instances would mint two token
 *   pairs — so a backing store shared across processes needs a delete that
 *   reports whether it won, not a read followed by a delete.
 * - Expiry is the store's to enforce. Every entry carries its own deadline and
 *   the accessors above drop what has passed, so an implementation may lean on
 *   a native TTL instead, but it may not serve an expired entry.
 */
export type TokenStore = {
  storePendingAuth(
    backlogState: string,
    pending: PendingAuthorization
  ): Awaitable<void>;
  consumePendingAuth(
    backlogState: string
  ): Awaitable<PendingAuthorization | undefined>;
  storeAuthCode(code: string, entry: AuthCodeEntry): Awaitable<void>;
  consumeAuthCode(code: string): Awaitable<AuthCodeEntry | undefined>;
  getClient(clientId: string): Awaitable<OAuthClientInfo | undefined>;
  registerClient(client: OAuthClientInfo): Awaitable<boolean>;
  getCachedVerification(token: string): Awaitable<AuthInfo | undefined>;
  cacheVerification(
    token: string,
    authInfo: AuthInfo,
    ttlMs: number
  ): Awaitable<void>;
  storeMcpToken(mcpToken: string, entry: McpTokenEntry): Awaitable<void>;
  getMcpToken(mcpToken: string): Awaitable<McpTokenEntry | undefined>;
  storeMcpRefreshToken(
    mcpRefreshToken: string,
    entry: McpRefreshEntry
  ): Awaitable<void>;
  consumeMcpRefreshToken(
    mcpRefreshToken: string
  ): Awaitable<McpRefreshEntry | undefined>;
  cleanup(): Awaitable<void>;
};

/**
 * What a module named by `--token-store-module` must export as its default.
 */
export type TokenStoreFactory = () => Awaitable<TokenStore>;

export function createTokenStore() {
  const pendingAuthorizations = new Map<string, PendingAuthorization>();
  const authorizationCodes = new Map<string, AuthCodeEntry>();
  const clients = new Map<string, OAuthClientInfo>();
  const verificationCache = new Map<string, CachedVerification>();
  const mcpAccessTokens = new Map<string, McpTokenEntry>();
  const mcpRefreshTokens = new Map<string, McpRefreshEntry>();

  const evictOldestClient = (): void => {
    const now = Math.floor(Date.now() / 1000);
    for (const [id, client] of clients) {
      if (now - client.client_id_issued_at > CLIENT_TTL_MS / 1000) {
        clients.delete(id);
        return;
      }
    }
  };

  return {
    storePendingAuth(
      backlogState: string,
      pending: PendingAuthorization
    ): void {
      pendingAuthorizations.set(backlogState, pending);
    },

    consumePendingAuth(backlogState: string): PendingAuthorization | undefined {
      const entry = pendingAuthorizations.get(backlogState);
      if (!entry) return undefined;
      pendingAuthorizations.delete(backlogState);
      if (Date.now() - entry.createdAt > PENDING_AUTH_TTL_MS) return undefined;
      return entry;
    },

    storeAuthCode(code: string, entry: AuthCodeEntry): void {
      authorizationCodes.set(code, entry);
    },

    consumeAuthCode(code: string): AuthCodeEntry | undefined {
      const entry = authorizationCodes.get(code);
      if (!entry) return undefined;
      authorizationCodes.delete(code);
      if (Date.now() > entry.expiresAt) return undefined;
      return entry;
    },

    getClient(clientId: string): OAuthClientInfo | undefined {
      return clients.get(clientId);
    },

    registerClient(client: OAuthClientInfo): boolean {
      if (clients.size >= MAX_CLIENTS) {
        evictOldestClient();
        if (clients.size >= MAX_CLIENTS) return false;
      }
      clients.set(client.client_id, client);
      return true;
    },

    getCachedVerification(token: string): AuthInfo | undefined {
      const cached = verificationCache.get(token);
      if (!cached) return undefined;
      if (Date.now() > cached.expiresAt) {
        verificationCache.delete(token);
        return undefined;
      }
      return cached.authInfo;
    },

    cacheVerification(token: string, authInfo: AuthInfo, ttlMs: number): void {
      verificationCache.set(token, {
        authInfo,
        expiresAt: Date.now() + ttlMs,
      });
    },

    storeMcpToken(mcpToken: string, entry: McpTokenEntry): void {
      mcpAccessTokens.set(mcpToken, entry);
    },

    getMcpToken(mcpToken: string): McpTokenEntry | undefined {
      const entry = mcpAccessTokens.get(mcpToken);
      if (!entry) return undefined;
      if (Date.now() > entry.expiresAt) {
        mcpAccessTokens.delete(mcpToken);
        return undefined;
      }
      return entry;
    },

    storeMcpRefreshToken(
      mcpRefreshToken: string,
      entry: McpRefreshEntry
    ): void {
      mcpRefreshTokens.set(mcpRefreshToken, entry);
    },

    consumeMcpRefreshToken(
      mcpRefreshToken: string
    ): McpRefreshEntry | undefined {
      const entry = mcpRefreshTokens.get(mcpRefreshToken);
      if (!entry) return undefined;
      mcpRefreshTokens.delete(mcpRefreshToken);
      if (Date.now() > entry.expiresAt) return undefined;
      return entry;
    },

    cleanup(): void {
      const now = Date.now();
      for (const [key, entry] of pendingAuthorizations) {
        if (now - entry.createdAt > PENDING_AUTH_TTL_MS)
          pendingAuthorizations.delete(key);
      }
      for (const [key, entry] of authorizationCodes) {
        if (now > entry.expiresAt) authorizationCodes.delete(key);
      }
      for (const [key, cached] of verificationCache) {
        if (now > cached.expiresAt) verificationCache.delete(key);
      }
      for (const [key, entry] of mcpAccessTokens) {
        if (now > entry.expiresAt) mcpAccessTokens.delete(key);
      }
      for (const [key, entry] of mcpRefreshTokens) {
        if (now > entry.expiresAt) mcpRefreshTokens.delete(key);
      }
      const nowSec = Math.floor(now / 1000);
      for (const [key, client] of clients) {
        if (nowSec - client.client_id_issued_at > CLIENT_TTL_MS / 1000)
          clients.delete(key);
      }
    },
  } satisfies TokenStore;
}
