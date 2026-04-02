import { describe, expect, it, vi } from 'vitest';

vi.mock('backlog-js', () => ({
  Backlog: class Backlog {
    host: string;
    apiKey: string;

    constructor({ host, apiKey }: { host: string; apiKey: string }) {
      this.host = host;
      this.apiKey = apiKey;
    }

    async getSpace() {
      return {
        host: this.host,
        apiKey: this.apiKey,
      };
    }
  },
}));

import { createTranslationHelper } from '../createTranslationHelper.js';
import { composeToolHandler } from '../handlers/builders/composeToolHandler.js';
import { getSpaceTool } from '../tools/getSpace.js';
import { createBacklogClientRegistry } from './backlogClientRegistry.js';

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
      createTranslationHelper()
    );
    const handler = composeToolHandler(tool, {
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
      createTranslationHelper()
    );
    const handler = composeToolHandler(tool, {
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
      createTranslationHelper()
    );
    const handler = composeToolHandler(tool, {
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
    ).toThrow(
      'Each multi-organization config must define both BACKLOG_ORG_<NAME>_DOMAIN and BACKLOG_ORG_<NAME>_API_KEY. Incomplete organizations: PRIMARY, SECONDARY.'
    );
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
      createTranslationHelper()
    );
    const handler = composeToolHandler(tool, {
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
