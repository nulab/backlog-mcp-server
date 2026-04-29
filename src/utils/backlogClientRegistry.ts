import { Backlog } from 'backlog-js';
import { getCurrentAccessToken } from '../auth/backlogAuthContext.js';
import { getCurrentOrganization } from './backlogOrganizationContext.js';

export type BacklogOrganizationInfo = {
  name: string;
  domain: string;
  isDefault: boolean;
};

export type BacklogClientResolver = (organization?: string) => Backlog;

export type BacklogClientRegistry = {
  resolveClient: BacklogClientResolver;
  createScopedClient: () => Backlog;
  listOrganizations: () => BacklogOrganizationInfo[];
  getDefaultOrganization: () => string | undefined;
};

type Environment = Record<string, string | undefined>;

type RegistryInput = {
  env?: Environment;
};

export function createBacklogClientRegistry(
  input: RegistryInput = {}
): BacklogClientRegistry {
  const env = input.env ?? process.env;
  const multiOrgRegistry = createMultiOrganizationRegistryFromEnv(env);

  if (multiOrgRegistry) {
    return multiOrgRegistry;
  }

  const domain = env.BACKLOG_DOMAIN;
  const apiKey = env.BACKLOG_API_KEY;

  if (!domain || !apiKey) {
    throw new Error(
      'Configure either BACKLOG_ORG_<NAME>_DOMAIN and BACKLOG_ORG_<NAME>_API_KEY with BACKLOG_DEFAULT_ORG, or both BACKLOG_DOMAIN and BACKLOG_API_KEY.'
    );
  }

  const defaultName = 'default';
  const client = new Backlog({ host: domain, apiKey });

  const info: BacklogOrganizationInfo = {
    name: defaultName,
    domain,
    isDefault: true,
  };

  return {
    resolveClient: (organization?: string) => {
      if (organization && organization !== defaultName) {
        throw new Error(
          `Unknown organization '${organization}'. Use list_organizations to inspect available organizations.`
        );
      }
      return client;
    },
    createScopedClient: () =>
      createBacklogClientProxy(() => {
        const organization = getCurrentOrganization();
        if (organization && organization !== defaultName) {
          throw new Error(
            `Unknown organization '${organization}'. Use list_organizations to inspect available organizations.`
          );
        }
        return client;
      }),
    listOrganizations: () => [info],
    getDefaultOrganization: () => defaultName,
  };
}

type ValidatedOrganizationConfig = {
  domain: string;
  apiKey: string;
};

function createMultiOrganizationRegistryFromEnv(
  env: Environment
): BacklogClientRegistry | undefined {
  const organizations = new Map<string, { domain?: string; apiKey?: string }>();
  let hasMultiOrgKeys = false;

  for (const [key, value] of Object.entries(env)) {
    const match = /^BACKLOG_ORG_(.+)_(DOMAIN|API_KEY)$/.exec(key);
    if (!match) {
      continue;
    }

    hasMultiOrgKeys = true;

    const [, organization, field] = match;
    const config = organizations.get(organization) ?? {};

    if (field === 'DOMAIN') {
      config.domain = value;
    } else {
      config.apiKey = value;
    }

    organizations.set(organization, config);
  }

  if (!hasMultiOrgKeys) {
    return undefined;
  }

  const invalidOrganizations = Array.from(organizations.entries())
    .filter(([, config]) => !config.domain || !config.apiKey)
    .map(([organization, config]) => {
      const missing = [];
      if (!config.domain) missing.push(`BACKLOG_ORG_${organization}_DOMAIN`);
      if (!config.apiKey) missing.push(`BACKLOG_ORG_${organization}_API_KEY`);
      return `${organization} (missing: ${missing.join(', ')})`;
    })
    .sort();

  if (invalidOrganizations.length > 0) {
    throw new Error(
      `Incomplete multi-organization configuration. ${invalidOrganizations.join('; ')}`
    );
  }

  if (organizations.size === 0) {
    throw new Error(
      'No valid multi-organization configuration was found. Define BACKLOG_ORG_<NAME>_DOMAIN and BACKLOG_ORG_<NAME>_API_KEY pairs.'
    );
  }

  const defaultOrganization = env.BACKLOG_DEFAULT_ORG;
  if (!defaultOrganization) {
    throw new Error(
      'BACKLOG_DEFAULT_ORG is required when using BACKLOG_ORG_<NAME>_DOMAIN and BACKLOG_ORG_<NAME>_API_KEY.'
    );
  }

  const clients = new Map<string, Backlog>();
  // At this point, all organizations have been validated to have both domain and apiKey
  const validatedOrganizations = organizations as Map<
    string,
    ValidatedOrganizationConfig
  >;
  const organizationInfo = Array.from(validatedOrganizations.entries()).map(
    ([name, config]) => {
      clients.set(
        name,
        new Backlog({
          host: config.domain as string,
          apiKey: config.apiKey as string,
        })
      );

      return {
        name,
        domain: config.domain,
        isDefault: name === defaultOrganization,
      };
    }
  );

  if (!clients.has(defaultOrganization)) {
    throw new Error(
      `BACKLOG_DEFAULT_ORG '${defaultOrganization}' does not match any configured organization. Use list_organizations to inspect available organizations.`
    );
  }

  return {
    resolveClient: (organization?: string) => {
      const orgName = organization ?? defaultOrganization;
      return resolveKnownClient(clients, orgName);
    },
    createScopedClient: () =>
      createBacklogClientProxy(() => {
        const organization = getCurrentOrganization();
        return organization === undefined
          ? resolveKnownClient(clients, defaultOrganization)
          : resolveKnownClient(clients, organization);
      }),
    listOrganizations: () => organizationInfo,
    getDefaultOrganization: () => defaultOrganization,
  };
}

function resolveKnownClient(
  clients: Map<string, Backlog>,
  organization: string
): Backlog {
  const client = clients.get(organization);

  if (!client) {
    throw new Error(
      `Unknown organization '${organization}'. Use list_organizations to inspect available organizations.`
    );
  }

  return client;
}

export function createOAuthBacklogClientRegistry(
  domain: string
): BacklogClientRegistry {
  const defaultName = 'default';
  const info: BacklogOrganizationInfo = {
    name: defaultName,
    domain,
    isDefault: true,
  };

  const resolveOAuthClient = (): Backlog => {
    const token = getCurrentAccessToken();
    if (!token) {
      throw new Error('No OAuth access token in current request context');
    }
    return new Backlog({ host: domain, accessToken: token });
  };

  return {
    resolveClient: () => resolveOAuthClient(),
    createScopedClient: () => createBacklogClientProxy(resolveOAuthClient),
    listOrganizations: () => [info],
    getDefaultOrganization: () => defaultName,
  };
}

function createBacklogClientProxy(resolveClient: () => Backlog): Backlog {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        const client = resolveClient();
        const value = Reflect.get(client, prop);

        if (typeof value === 'function') {
          return value.bind(client);
        }

        return value;
      },
    }
  ) as Backlog;
}
