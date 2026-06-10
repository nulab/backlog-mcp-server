// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

export type BacklogOAuthConfig = {
  clientId: string;
  clientSecret: string;
  backlogDomain: string;
  serverBaseUrl: string;
};

export type OAuthConfigResolver = {
  resolve: (host: string) => BacklogOAuthConfig | undefined;
  resolveByBacklogDomain: (
    backlogDomain: string
  ) => BacklogOAuthConfig | undefined;
  getConfiguredHostnames: () => string[];
  isMultiSite: boolean;
};

type Environment = Record<string, string | undefined>;

export function getBacklogOAuthConfig(
  env: Environment = process.env
): BacklogOAuthConfig | undefined {
  const clientId = env.BACKLOG_OAUTH_CLIENT_ID;
  if (!clientId) return undefined;

  const clientSecret = env.BACKLOG_OAUTH_CLIENT_SECRET;
  if (!clientSecret) {
    throw new Error(
      'BACKLOG_OAUTH_CLIENT_SECRET is required when BACKLOG_OAUTH_CLIENT_ID is set.'
    );
  }

  const backlogDomain = env.BACKLOG_DOMAIN;
  if (!backlogDomain) {
    throw new Error(
      'BACKLOG_DOMAIN is required when BACKLOG_OAUTH_CLIENT_ID is set.'
    );
  }

  const serverBaseUrl = env.MCP_SERVER_BASE_URL;
  if (!serverBaseUrl) {
    throw new Error(
      'MCP_SERVER_BASE_URL is required when BACKLOG_OAUTH_CLIENT_ID is set.'
    );
  }

  return {
    clientId,
    clientSecret,
    backlogDomain,
    serverBaseUrl: serverBaseUrl.replace(/\/+$/, ''),
  };
}

function extractHostname(baseUrl: string): string {
  return new URL(baseUrl).hostname;
}

function parseMultiSiteConfigs(
  env: Environment
): Map<string, BacklogOAuthConfig> {
  const siteNames = new Set<string>();
  const prefix = 'BACKLOG_OAUTH_SITE_';
  for (const key of Object.keys(env)) {
    const match = key.match(
      /^BACKLOG_OAUTH_SITE_([A-Z0-9_]+)_(BASE_URL|CLIENT_ID|CLIENT_SECRET|DOMAIN)$/
    );
    if (match) siteNames.add(match[1]);
  }

  const configs = new Map<string, BacklogOAuthConfig>();
  for (const name of siteNames) {
    const baseUrl = env[`${prefix}${name}_BASE_URL`];
    const clientId = env[`${prefix}${name}_CLIENT_ID`];
    const clientSecret = env[`${prefix}${name}_CLIENT_SECRET`];
    const domain = env[`${prefix}${name}_DOMAIN`];

    if (!baseUrl || !clientId || !clientSecret || !domain) {
      throw new Error(
        `Incomplete OAuth site configuration for ${name}. ` +
          `All of BACKLOG_OAUTH_SITE_${name}_BASE_URL, _CLIENT_ID, _CLIENT_SECRET, and _DOMAIN are required.`
      );
    }

    const hostname = extractHostname(baseUrl);
    if (configs.has(hostname)) {
      throw new Error(
        `Duplicate hostname '${hostname}' in multi-site OAuth configuration. Each site must use a unique BASE_URL hostname.`
      );
    }
    configs.set(hostname, {
      clientId,
      clientSecret,
      backlogDomain: domain,
      serverBaseUrl: baseUrl.replace(/\/+$/, ''),
    });
  }

  const seenDomains = new Map<string, string>();
  for (const [hostname, config] of configs) {
    const existing = seenDomains.get(config.backlogDomain);
    if (existing) {
      throw new Error(
        `Duplicate Backlog domain '${config.backlogDomain}' configured for both '${existing}' and '${hostname}'. Each site must use a unique Backlog domain.`
      );
    }
    seenDomains.set(config.backlogDomain, hostname);
  }

  return configs;
}

export function getOAuthConfigResolver(
  env: Environment = process.env
): OAuthConfigResolver | undefined {
  const multiSiteConfigs = parseMultiSiteConfigs(env);

  if (multiSiteConfigs.size > 0) {
    const byDomain = new Map<string, BacklogOAuthConfig>();
    for (const config of multiSiteConfigs.values()) {
      byDomain.set(config.backlogDomain, config);
    }
    return {
      resolve: (host: string) => {
        const hostname = extractHostname(`http://${host}`);
        return multiSiteConfigs.get(hostname);
      },
      resolveByBacklogDomain: (backlogDomain: string) =>
        byDomain.get(backlogDomain),
      getConfiguredHostnames: () => [...multiSiteConfigs.keys()],
      isMultiSite: true,
    };
  }

  const singleConfig = getBacklogOAuthConfig(env);
  if (!singleConfig) return undefined;

  const hostname = extractHostname(singleConfig.serverBaseUrl);
  return {
    resolve: () => singleConfig,
    resolveByBacklogDomain: () => singleConfig,
    getConfiguredHostnames: () => [hostname],
    isMultiSite: false,
  };
}
