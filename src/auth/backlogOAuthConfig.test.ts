// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import { getBacklogOAuthConfig } from './backlogOAuthConfig.js';

describe('getBacklogOAuthConfig', () => {
  it('returns undefined when BACKLOG_OAUTH_CLIENT_ID is not set', () => {
    const result = getBacklogOAuthConfig({});
    expect(result).toBeUndefined();
  });

  it('returns config when all required variables are set', () => {
    const env = {
      BACKLOG_OAUTH_CLIENT_ID: 'my-client-id',
      BACKLOG_OAUTH_CLIENT_SECRET: 'my-client-secret',
      BACKLOG_DOMAIN: 'example.backlog.com',
      MCP_SERVER_BASE_URL: 'https://mcp.example.com',
    };
    const result = getBacklogOAuthConfig(env);
    expect(result).toEqual({
      clientId: 'my-client-id',
      clientSecret: 'my-client-secret',
      backlogDomain: 'example.backlog.com',
      serverBaseUrl: 'https://mcp.example.com',
    });
  });

  it('strips trailing slashes from serverBaseUrl', () => {
    const env = {
      BACKLOG_OAUTH_CLIENT_ID: 'id',
      BACKLOG_OAUTH_CLIENT_SECRET: 'secret',
      BACKLOG_DOMAIN: 'example.backlog.com',
      MCP_SERVER_BASE_URL: 'https://mcp.example.com///',
    };
    const result = getBacklogOAuthConfig(env);
    expect(result?.serverBaseUrl).toBe('https://mcp.example.com');
  });

  it('throws when BACKLOG_OAUTH_CLIENT_SECRET is missing', () => {
    const env = { BACKLOG_OAUTH_CLIENT_ID: 'id' };
    expect(() => getBacklogOAuthConfig(env)).toThrow(
      'BACKLOG_OAUTH_CLIENT_SECRET is required'
    );
  });

  it('throws when BACKLOG_DOMAIN is missing', () => {
    const env = {
      BACKLOG_OAUTH_CLIENT_ID: 'id',
      BACKLOG_OAUTH_CLIENT_SECRET: 'secret',
    };
    expect(() => getBacklogOAuthConfig(env)).toThrow(
      'BACKLOG_DOMAIN is required'
    );
  });

  it('throws when MCP_SERVER_BASE_URL is missing', () => {
    const env = {
      BACKLOG_OAUTH_CLIENT_ID: 'id',
      BACKLOG_OAUTH_CLIENT_SECRET: 'secret',
      BACKLOG_DOMAIN: 'example.backlog.com',
    };
    expect(() => getBacklogOAuthConfig(env)).toThrow(
      'MCP_SERVER_BASE_URL is required'
    );
  });
});
