import { Backlog } from 'backlog-js';
import * as backlogjs from 'backlog-js';
import { cosmiconfigSync } from 'cosmiconfig';
import { extname } from 'node:path';
import { z } from 'zod';
import { getCurrentOrganization } from './backlogOrganizationContext.js';

const organizationSchema = z.object({
  domain: z.string().min(1),
  apiKey: z.string().min(1),
});

const organizationsConfigSchema = z.object({
  defaultOrg: z.string().min(1).optional(),
  organizations: z.record(z.string().min(1), organizationSchema),
});

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

type RegistryInput = {
  env?: NodeJS.ProcessEnv;
};

export function createBacklogClientRegistry(
  input: RegistryInput = {}
): BacklogClientRegistry {
  const env = input.env ?? process.env;
  const configuredPath = env.BACKLOG_ORGANIZATIONS_CONFIG;

  if (configuredPath != null && configuredPath.trim().length > 0) {
    return createMultiOrganizationRegistryFromPath(configuredPath);
  }

  const domain = env.BACKLOG_DOMAIN;
  const apiKey = env.BACKLOG_API_KEY;

  if (!domain || !apiKey) {
    throw new Error(
      'Either BACKLOG_ORGANIZATIONS_CONFIG (path to a YAML config file) or both BACKLOG_DOMAIN and BACKLOG_API_KEY are required.'
    );
  }

  const defaultName = 'default';
  const client = new backlogjs.Backlog({ host: domain, apiKey });

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
    createScopedClient: () => createBacklogClientProxy(() => client),
    listOrganizations: () => [info],
    getDefaultOrganization: () => defaultName,
  };
}

function createMultiOrganizationRegistryFromPath(
  configPath: string
): BacklogClientRegistry {
  const extension = extname(configPath).toLowerCase();
  if (extension !== '.yml' && extension !== '.yaml') {
    throw new Error(
      'BACKLOG_ORGANIZATIONS_CONFIG must point to a .yml or .yaml file.'
    );
  }

  const explorer = cosmiconfigSync('backlog-mcp-server');

  let loadedConfig: unknown;

  try {
    const result = explorer.load(configPath);
    loadedConfig = result?.config;
  } catch (error) {
    throw new Error(
      `BACKLOG_ORGANIZATIONS_CONFIG must point to a readable YAML config file: ${(error as Error).message}`
    );
  }

  if (loadedConfig == null) {
    throw new Error(
      `BACKLOG_ORGANIZATIONS_CONFIG did not load any configuration from '${configPath}'.`
    );
  }

  const parsed = organizationsConfigSchema.safeParse(loadedConfig);

  if (!parsed.success) {
    throw new Error(
      `Organization config at '${configPath}' is invalid: ${parsed.error.issues
        .map((issue) => issue.message)
        .join(', ')}`
    );
  }

  const organizations = Object.entries(parsed.data.organizations);

  if (organizations.length === 0) {
    throw new Error(
      `Organization config at '${configPath}' must define at least one organization.`
    );
  }

  if (
    parsed.data.defaultOrg &&
    !(parsed.data.defaultOrg in parsed.data.organizations)
  ) {
    throw new Error(
      `Organization config at '${configPath}' declares defaultOrg '${parsed.data.defaultOrg}' that does not exist in organizations.`
    );
  }

  const clients = new Map<string, Backlog>();
  const organizationInfo = organizations.map(([name, config]) => {
    clients.set(
      name,
      new backlogjs.Backlog({ host: config.domain, apiKey: config.apiKey })
    );

    return {
      name,
      domain: config.domain,
      isDefault: name === parsed.data.defaultOrg,
    };
  });

  const defaultOrganization =
    parsed.data.defaultOrg ?? (organizationInfo.length === 1
      ? organizationInfo[0].name
      : undefined);

  return {
    resolveClient: (organization?: string) => {
      const orgName = organization ?? defaultOrganization;

      if (!orgName) {
        throw new Error(
          'Multiple organizations are configured. Provide the organization field or configure defaultOrg.'
        );
      }

      const client = clients.get(orgName);

      if (!client) {
        throw new Error(
          `Unknown organization '${orgName}'. Use list_organizations to inspect available organizations.`
        );
      }

      return client;
    },
    createScopedClient: () =>
      createBacklogClientProxy(() => {
        const organization = getCurrentOrganization();
        return organization === undefined
          ? resolveDefaultClient(clients, defaultOrganization)
          : resolveKnownClient(clients, organization);
      }),
    listOrganizations: () =>
      organizationInfo.map((organization) => ({
        ...organization,
        isDefault: organization.name === defaultOrganization,
      })),
    getDefaultOrganization: () => defaultOrganization,
  };
}

function resolveDefaultClient(
  clients: Map<string, Backlog>,
  defaultOrganization: string | undefined
): Backlog {
  if (defaultOrganization) {
    return resolveKnownClient(clients, defaultOrganization);
  }

  throw new Error(
    'Multiple organizations are configured. Provide the organization field or configure defaultOrg.'
  );
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

function createBacklogClientProxy(resolveClient: () => Backlog): Backlog {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        const client = resolveClient();
        const value = Reflect.get(client as object, prop);

        if (typeof value === 'function') {
          return value.bind(client);
        }

        return value;
      },
    }
  ) as Backlog;
}
