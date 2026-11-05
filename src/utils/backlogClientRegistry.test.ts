import { describe, expect, it, vi } from 'vite-plus/test';
import { createDescriptionHelper } from '../createDescriptionHelper.js';
import { composeToolHandler } from '../handlers/builders/composeToolHandler.js';
import { getSpaceTool } from '../tools/getSpace.js';
import { runWithAccessToken } from '../auth/backlogAuthContext.js';
import { runWithBacklogHost } from '../auth/backlogHost.js';
import {
  createBacklogClientRegistry,
  createTokenPassthroughBacklogClientRegistry,
} from './backlogClientRegistry.js';

vi.mock('backlog-js', () => ({
  createClient: (configure: {
    host: string;
    apiKey: string;
    userAgent?: string;
  }) => ({ ...configure }),
  getSpace: async (client: {
    host: string;
    apiKey: string;
    userAgent?: string;
  }) => ({
    host: client.host,
    apiKey: client.apiKey,
    userAgent: client.userAgent,
  }),
}));

describe('createBacklogClientRegistry', () => {
  it('uses single-org fallback env vars when multi-org env is absent', async () => {
    const registry = createBacklogClientRegistry({
      env: {
        BACKLOG_DOMAIN: 'single.backlog.com',
        BACKLOG_API_KEY: 'single-key',
      },
    });

    const tool = getSpaceTool(
      registry.createScopedClient(),
      createDescriptionHelper()
    );
    const { handler } = composeToolHandler(tool, {
      useFields: false,
      maxTokens: 5000,
    });

    const result = await handler({}, {} as never);
    const content = result.content[0];
    expect(content.type).toBe('text');
    if (content.type === 'text') {
      expect(content.text).toContain('single.backlog.com');
      expect(content.text).toContain('single-key');
    }
  });

  it('sends a backlog-mcp-server User-Agent on the Backlog client', async () => {
    const registry = createBacklogClientRegistry({
      env: {
        BACKLOG_DOMAIN: 'single.backlog.com',
        BACKLOG_API_KEY: 'single-key',
      },
    });

    const tool = getSpaceTool(
      registry.createScopedClient(),
      createDescriptionHelper()
    );
    const { handler } = composeToolHandler(tool, {
      useFields: false,
      maxTokens: 5000,
    });

    const result = await handler({}, {} as never);
    const content = result.content[0];
    expect(content.type).toBe('text');
    if (content.type === 'text') {
      expect(content.text).toMatch(/backlog-mcp-server\/\d+\.\d+\.\d+/);
    }
  });

  it('routes a request to the selected organization', async () => {
    const registry = createBacklogClientRegistry({
      env: {
        BACKLOG_DEFAULT_ORG: 'PRIMARY',
        BACKLOG_ORG_PRIMARY_DOMAIN: 'primary.backlog.com',
        BACKLOG_ORG_PRIMARY_API_KEY: 'primary-key',
        BACKLOG_ORG_SECONDARY_DOMAIN: 'secondary.backlog.com',
        BACKLOG_ORG_SECONDARY_API_KEY: 'secondary-key',
      },
    });

    const tool = getSpaceTool(
      registry.createScopedClient(),
      createDescriptionHelper()
    );
    const { handler } = composeToolHandler(tool, {
      useFields: false,
      maxTokens: 5000,
    });

    const result = await handler({ organization: 'SECONDARY' }, {} as never);
    const content = result.content[0];
    expect(content.type).toBe('text');
    if (content.type === 'text') {
      expect(content.text).toContain('secondary.backlog.com');
      expect(content.text).toContain('secondary-key');
    }
  });

  it('uses the default organization when organization is omitted', async () => {
    const registry = createBacklogClientRegistry({
      env: {
        BACKLOG_DEFAULT_ORG: 'SECONDARY',
        BACKLOG_ORG_PRIMARY_DOMAIN: 'primary.backlog.com',
        BACKLOG_ORG_PRIMARY_API_KEY: 'primary-key',
        BACKLOG_ORG_SECONDARY_DOMAIN: 'secondary.backlog.com',
        BACKLOG_ORG_SECONDARY_API_KEY: 'secondary-key',
      },
    });

    const tool = getSpaceTool(
      registry.createScopedClient(),
      createDescriptionHelper()
    );
    const { handler } = composeToolHandler(tool, {
      useFields: false,
      maxTokens: 5000,
    });

    const result = await handler({}, {} as never);
    const content = result.content[0];
    expect(content.type).toBe('text');
    if (content.type === 'text') {
      expect(content.text).toContain('secondary.backlog.com');
      expect(content.text).toContain('secondary-key');
    }
  });

  it('rejects unknown organizations', async () => {
    const registry = createBacklogClientRegistry({
      env: {
        BACKLOG_DEFAULT_ORG: 'PRIMARY',
        BACKLOG_ORG_PRIMARY_DOMAIN: 'primary.backlog.com',
        BACKLOG_ORG_PRIMARY_API_KEY: 'primary-key',
      },
    });

    expect(() => registry.resolveClient('missing')).toThrow(
      "Unknown organization 'missing'. Use list_organizations to inspect available organizations."
    );
  });

  it('requires a default organization in multi-org mode', () => {
    expect(() =>
      createBacklogClientRegistry({
        env: {
          BACKLOG_ORG_PRIMARY_DOMAIN: 'primary.backlog.com',
          BACKLOG_ORG_PRIMARY_API_KEY: 'primary-key',
        },
      })
    ).toThrow(
      'BACKLOG_DEFAULT_ORG is required when using BACKLOG_ORG_<NAME>_DOMAIN and BACKLOG_ORG_<NAME>_API_KEY.'
    );
  });

  it('requires the default organization to match a configured organization', () => {
    expect(() =>
      createBacklogClientRegistry({
        env: {
          BACKLOG_DEFAULT_ORG: 'missing',
          BACKLOG_ORG_PRIMARY_DOMAIN: 'primary.backlog.com',
          BACKLOG_ORG_PRIMARY_API_KEY: 'primary-key',
        },
      })
    ).toThrow(
      "BACKLOG_DEFAULT_ORG 'missing' does not match any configured organization. Use list_organizations to inspect available organizations."
    );
  });

  it('rejects incomplete multi-org definitions', () => {
    expect(() =>
      createBacklogClientRegistry({
        env: {
          BACKLOG_DEFAULT_ORG: 'PRIMARY',
          BACKLOG_ORG_PRIMARY_DOMAIN: 'primary.backlog.com',
          BACKLOG_ORG_SECONDARY_API_KEY: 'secondary-key',
        },
      })
    ).toThrow('Incomplete multi-organization configuration');
  });

  it('rejects unknown organizations in single-org mode via scoped client', async () => {
    const registry = createBacklogClientRegistry({
      env: {
        BACKLOG_DOMAIN: 'single.backlog.com',
        BACKLOG_API_KEY: 'single-key',
      },
    });

    const tool = getSpaceTool(
      registry.createScopedClient(),
      createDescriptionHelper()
    );
    const { handler } = composeToolHandler(tool, {
      useFields: false,
      maxTokens: 5000,
    });

    const result = await handler({ organization: 'NONEXISTENT' }, {} as never);
    expect(result.isError).toBe(true);
    const content = result.content[0];
    if (content.type === 'text') {
      expect(content.text).toContain("Unknown organization 'NONEXISTENT'");
    }
  });

  it('prefers multi-org env config over single-org fallback env vars', async () => {
    const registry = createBacklogClientRegistry({
      env: {
        BACKLOG_DOMAIN: 'single.backlog.com',
        BACKLOG_API_KEY: 'single-key',
        BACKLOG_DEFAULT_ORG: 'PRIMARY',
        BACKLOG_ORG_PRIMARY_DOMAIN: 'primary.backlog.com',
        BACKLOG_ORG_PRIMARY_API_KEY: 'primary-key',
      },
    });

    const tool = getSpaceTool(
      registry.createScopedClient(),
      createDescriptionHelper()
    );
    const { handler } = composeToolHandler(tool, {
      useFields: false,
      maxTokens: 5000,
    });

    const result = await handler({}, {} as never);
    const content = result.content[0];
    expect(content.type).toBe('text');
    if (content.type === 'text') {
      expect(content.text).toContain('primary.backlog.com');
      expect(content.text).toContain('primary-key');
      expect(content.text).not.toContain('single.backlog.com');
    }
  });
});

describe('createTokenPassthroughBacklogClientRegistry', () => {
  it('builds the client from the token and space of the current request', async () => {
    const registry = createTokenPassthroughBacklogClientRegistry();

    const client = await runWithBacklogHost('acme.backlog.com', () =>
      runWithAccessToken('user-token', async () => registry.resolveClient())
    );

    expect(client).toMatchObject({
      host: 'acme.backlog.com',
      accessToken: 'user-token',
    });
  });

  it('keeps concurrent requests on their own space and token', async () => {
    const scoped =
      createTokenPassthroughBacklogClientRegistry().createScopedClient();
    const hostOf = (host: string, token: string) =>
      runWithBacklogHost(host, () =>
        runWithAccessToken(token, async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return [
            Reflect.get(scoped, 'host'),
            Reflect.get(scoped, 'accessToken'),
          ];
        })
      );

    const results = await Promise.all([
      hostOf('a.backlog.com', 'token-a'),
      hostOf('b.backlog.jp', 'token-b'),
    ]);

    expect(results).toEqual([
      ['a.backlog.com', 'token-a'],
      ['b.backlog.jp', 'token-b'],
    ]);
  });

  it('refuses to build a client outside a request', () => {
    const registry = createTokenPassthroughBacklogClientRegistry();
    expect(() => registry.resolveClient()).toThrow(
      'No Backlog access token or space in current request context'
    );
  });

  it('does not publish the organization parameter', () => {
    expect(
      createTokenPassthroughBacklogClientRegistry().isMultiOrganization
    ).toBe(false);
  });
});
