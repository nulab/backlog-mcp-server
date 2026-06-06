// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';

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

type PendingAuthorization = {
  mcpClientId: string;
  codeChallenge: string;
  redirectUri: string;
  resource?: string;
  scopes: string[];
  state?: string;
  createdAt: number;
};

type AuthCodeEntry = {
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

type McpRefreshEntry = {
  backlogRefreshToken: string;
  clientId: string;
  expiresAt: number;
};

const PENDING_AUTH_TTL_MS = 10 * 60 * 1000;
const CLIENT_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
const MAX_CLIENTS = 1000;

export type TokenStore = ReturnType<typeof createTokenStore>;

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
  };
}
