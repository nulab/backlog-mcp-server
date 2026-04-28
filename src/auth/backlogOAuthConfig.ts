// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

export type BacklogOAuthConfig = {
  clientId: string;
  clientSecret: string;
  backlogDomain: string;
  serverBaseUrl: string;
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
