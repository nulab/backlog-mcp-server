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
  scopes: string[];
  state?: string;
  createdAt: number;
};

type AuthCodeEntry = {
  mcpClientId: string;
  backlogTokens: BacklogTokenData;
  codeChallenge: string;
  redirectUri: string;
  expiresAt: number;
};

type CachedVerification = {
  authInfo: AuthInfo;
  expiresAt: number;
};

const PENDING_AUTH_TTL_MS = 10 * 60 * 1000;
const AUTH_CODE_TTL_MS = 10 * 60 * 1000;

export class TokenStore {
  private pendingAuthorizations = new Map<string, PendingAuthorization>();
  private authorizationCodes = new Map<string, AuthCodeEntry>();
  private clients = new Map<string, OAuthClientInfo>();
  private verificationCache = new Map<string, CachedVerification>();

  storePendingAuth(backlogState: string, pending: PendingAuthorization): void {
    this.pendingAuthorizations.set(backlogState, pending);
  }

  consumePendingAuth(backlogState: string): PendingAuthorization | undefined {
    const entry = this.pendingAuthorizations.get(backlogState);
    if (!entry) return undefined;
    this.pendingAuthorizations.delete(backlogState);
    if (Date.now() - entry.createdAt > PENDING_AUTH_TTL_MS) return undefined;
    return entry;
  }

  storeAuthCode(code: string, entry: AuthCodeEntry): void {
    this.authorizationCodes.set(code, entry);
  }

  consumeAuthCode(code: string): AuthCodeEntry | undefined {
    const entry = this.authorizationCodes.get(code);
    if (!entry) return undefined;
    this.authorizationCodes.delete(code);
    if (Date.now() > entry.expiresAt) return undefined;
    return entry;
  }

  getClient(clientId: string): OAuthClientInfo | undefined {
    return this.clients.get(clientId);
  }

  registerClient(client: OAuthClientInfo): void {
    this.clients.set(client.client_id, client);
  }

  getCachedVerification(token: string): AuthInfo | undefined {
    const cached = this.verificationCache.get(token);
    if (!cached) return undefined;
    if (Date.now() > cached.expiresAt) {
      this.verificationCache.delete(token);
      return undefined;
    }
    return cached.authInfo;
  }

  cacheVerification(token: string, authInfo: AuthInfo, ttlMs: number): void {
    this.verificationCache.set(token, {
      authInfo,
      expiresAt: Date.now() + ttlMs,
    });
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.pendingAuthorizations) {
      if (now - entry.createdAt > PENDING_AUTH_TTL_MS)
        this.pendingAuthorizations.delete(key);
    }
    for (const [key, entry] of this.authorizationCodes) {
      if (now > entry.expiresAt) this.authorizationCodes.delete(key);
    }
    for (const [key, cached] of this.verificationCache) {
      if (now > cached.expiresAt) this.verificationCache.delete(key);
    }
  }
}
