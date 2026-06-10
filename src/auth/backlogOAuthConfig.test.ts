// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import {
  getBacklogOAuthConfig,
  getOAuthConfigResolver,
} from './backlogOAuthConfig.js';

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

describe('getOAuthConfigResolver', () => {
  it('returns undefined when no OAuth config is set', () => {
    expect(getOAuthConfigResolver({})).toBeUndefined();
  });

  describe('single-site', () => {
    const env = {
      BACKLOG_OAUTH_CLIENT_ID: 'id',
      BACKLOG_OAUTH_CLIENT_SECRET: 'secret',
      BACKLOG_DOMAIN: 'example.backlog.com',
      MCP_SERVER_BASE_URL: 'https://mcp.example.com',
    };

    it('resolves any host to the single config', () => {
      const resolver = getOAuthConfigResolver(env)!;
      expect(resolver).toBeDefined();
      const config = resolver.resolve('mcp.example.com');
      expect(config?.clientId).toBe('id');
      expect(config?.backlogDomain).toBe('example.backlog.com');
    });

    it('resolveByBacklogDomain returns the single config', () => {
      const resolver = getOAuthConfigResolver(env)!;
      expect(resolver.resolveByBacklogDomain('anything')).toBeDefined();
    });

    it('returns configured hostname from serverBaseUrl', () => {
      const resolver = getOAuthConfigResolver(env)!;
      expect(resolver.getConfiguredHostnames()).toEqual(['mcp.example.com']);
    });

    it('is not multi-site', () => {
      const resolver = getOAuthConfigResolver(env)!;
      expect(resolver.isMultiSite).toBe(false);
    });
  });

  describe('multi-site', () => {
    const env = {
      BACKLOG_OAUTH_SITE_A_BASE_URL: 'https://mcp-a.example.com',
      BACKLOG_OAUTH_SITE_A_CLIENT_ID: 'id-a',
      BACKLOG_OAUTH_SITE_A_CLIENT_SECRET: 'secret-a',
      BACKLOG_OAUTH_SITE_A_DOMAIN: 'company-a.backlog.com',
      BACKLOG_OAUTH_SITE_B_BASE_URL: 'https://mcp-b.example.com',
      BACKLOG_OAUTH_SITE_B_CLIENT_ID: 'id-b',
      BACKLOG_OAUTH_SITE_B_CLIENT_SECRET: 'secret-b',
      BACKLOG_OAUTH_SITE_B_DOMAIN: 'company-b.backlog.com',
    };

    it('resolves site A by hostname', () => {
      const resolver = getOAuthConfigResolver(env)!;
      const config = resolver.resolve('mcp-a.example.com');
      expect(config?.clientId).toBe('id-a');
      expect(config?.backlogDomain).toBe('company-a.backlog.com');
    });

    it('resolves site B by hostname', () => {
      const resolver = getOAuthConfigResolver(env)!;
      const config = resolver.resolve('mcp-b.example.com');
      expect(config?.clientId).toBe('id-b');
      expect(config?.backlogDomain).toBe('company-b.backlog.com');
    });

    it('strips port from host before resolving', () => {
      const resolver = getOAuthConfigResolver(env)!;
      const config = resolver.resolve('mcp-a.example.com:443');
      expect(config?.clientId).toBe('id-a');
    });

    it('returns undefined for unknown host', () => {
      const resolver = getOAuthConfigResolver(env)!;
      expect(resolver.resolve('unknown.example.com')).toBeUndefined();
    });

    it('resolves by backlog domain', () => {
      const resolver = getOAuthConfigResolver(env)!;
      const config = resolver.resolveByBacklogDomain('company-b.backlog.com');
      expect(config?.clientId).toBe('id-b');
    });

    it('returns all configured hostnames', () => {
      const resolver = getOAuthConfigResolver(env)!;
      const hostnames = resolver.getConfiguredHostnames();
      expect(hostnames).toHaveLength(2);
      expect(hostnames).toContain('mcp-a.example.com');
      expect(hostnames).toContain('mcp-b.example.com');
    });

    it('is multi-site', () => {
      const resolver = getOAuthConfigResolver(env)!;
      expect(resolver.isMultiSite).toBe(true);
    });

    it('throws for incomplete site config', () => {
      const incomplete = {
        BACKLOG_OAUTH_SITE_X_BASE_URL: 'https://mcp-x.example.com',
        BACKLOG_OAUTH_SITE_X_CLIENT_ID: 'id-x',
      };
      expect(() => getOAuthConfigResolver(incomplete)).toThrow(
        'Incomplete OAuth site configuration for X'
      );
    });

    it('throws for duplicate hostname', () => {
      const dup = {
        BACKLOG_OAUTH_SITE_A_BASE_URL: 'https://mcp.example.com',
        BACKLOG_OAUTH_SITE_A_CLIENT_ID: 'id-a',
        BACKLOG_OAUTH_SITE_A_CLIENT_SECRET: 'secret-a',
        BACKLOG_OAUTH_SITE_A_DOMAIN: 'a.backlog.com',
        BACKLOG_OAUTH_SITE_B_BASE_URL: 'https://mcp.example.com',
        BACKLOG_OAUTH_SITE_B_CLIENT_ID: 'id-b',
        BACKLOG_OAUTH_SITE_B_CLIENT_SECRET: 'secret-b',
        BACKLOG_OAUTH_SITE_B_DOMAIN: 'b.backlog.com',
      };
      expect(() => getOAuthConfigResolver(dup)).toThrow(
        "Duplicate hostname 'mcp.example.com'"
      );
    });

    it('throws for duplicate Backlog domain', () => {
      const dup = {
        BACKLOG_OAUTH_SITE_A_BASE_URL: 'https://mcp-a.example.com',
        BACKLOG_OAUTH_SITE_A_CLIENT_ID: 'id-a',
        BACKLOG_OAUTH_SITE_A_CLIENT_SECRET: 'secret-a',
        BACKLOG_OAUTH_SITE_A_DOMAIN: 'same.backlog.com',
        BACKLOG_OAUTH_SITE_B_BASE_URL: 'https://mcp-b.example.com',
        BACKLOG_OAUTH_SITE_B_CLIENT_ID: 'id-b',
        BACKLOG_OAUTH_SITE_B_CLIENT_SECRET: 'secret-b',
        BACKLOG_OAUTH_SITE_B_DOMAIN: 'same.backlog.com',
      };
      expect(() => getOAuthConfigResolver(dup)).toThrow(
        "Duplicate Backlog domain 'same.backlog.com'"
      );
    });

    it('multi-site takes precedence over single-site', () => {
      const mixed = {
        ...env,
        BACKLOG_OAUTH_CLIENT_ID: 'single-id',
        BACKLOG_OAUTH_CLIENT_SECRET: 'single-secret',
        BACKLOG_DOMAIN: 'single.backlog.com',
        MCP_SERVER_BASE_URL: 'https://single.example.com',
      };
      const resolver = getOAuthConfigResolver(mixed)!;
      expect(resolver.resolve('mcp-a.example.com')?.clientId).toBe('id-a');
      expect(resolver.resolve('single.example.com')).toBeUndefined();
    });
  });
});
