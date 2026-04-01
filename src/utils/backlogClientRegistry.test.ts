import { afterAll, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

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
  const tempDirs: string[] = [];

  function writeOrgConfig(
    filename: string,
    content: string
  ): string {
    const dir = mkdtempSync(join(tmpdir(), 'backlog-org-config-'));
    tempDirs.push(dir);
    const filepath = join(dir, filename);
    writeFileSync(filepath, content);
    return filepath;
  }

  afterAll(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('uses single-org fallback env vars when multi-org config is absent', async () => {
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
    const configPath = writeOrgConfig(
      'organizations.yml',
      [
        'defaultOrg: primary',
        'organizations:',
        '  primary:',
        '    domain: primary.backlog.com',
        '    apiKey: primary-key',
        '  secondary:',
        '    domain: secondary.backlog.com',
        '    apiKey: secondary-key',
        '',
      ].join('\n')
    );

    const registry = createBacklogClientRegistry({
      env: {
        BACKLOG_ORGANIZATIONS_CONFIG: configPath,
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

    const result = await handler({ organization: 'secondary' }, {} as never);
    const content = result.content[0];
    expect(content.type).toBe('text');
    if (content.type === 'text') {
      expect(content.text).toContain('secondary.backlog.com');
      expect(content.text).toContain('secondary-key');
    }
  });

  it('requires organization when multiple organizations exist without a default', async () => {
    const configPath = writeOrgConfig(
      'organizations.yml',
      [
        'organizations:',
        '  first:',
        '    domain: first.backlog.com',
        '    apiKey: first-key',
        '  second:',
        '    domain: second.backlog.com',
        '    apiKey: second-key',
        '',
      ].join('\n')
    );

    const registry = createBacklogClientRegistry({
      env: {
        BACKLOG_ORGANIZATIONS_CONFIG: configPath,
      },
    });

    expect(() => registry.resolveClient()).toThrow(
      'Multiple organizations are configured. Provide the organization field or configure defaultOrg.'
    );
  });

  it('rejects unknown organizations', async () => {
    const configPath = writeOrgConfig(
      'organizations.yaml',
      [
        'defaultOrg: primary',
        'organizations:',
        '  primary:',
        '    domain: primary.backlog.com',
        '    apiKey: primary-key',
        '',
      ].join('\n')
    );

    const registry = createBacklogClientRegistry({
      env: {
        BACKLOG_ORGANIZATIONS_CONFIG: configPath,
      },
    });

    expect(() => registry.resolveClient('missing')).toThrow(
      "Unknown organization 'missing'. Use list_organizations to inspect available organizations."
    );
  });

  it('fails clearly when the config file cannot be read', () => {
    expect(() =>
      createBacklogClientRegistry({
        env: {
          BACKLOG_ORGANIZATIONS_CONFIG: '/tmp/does-not-exist-backlog-orgs.yml',
        },
      })
    ).toThrow(
      'BACKLOG_ORGANIZATIONS_CONFIG must point to a readable YAML config file:'
    );
  });

  it('rejects non-yaml config paths', () => {
    const configPath = writeOrgConfig(
      'organizations.json',
      '{"defaultOrg":"primary","organizations":{"primary":{"domain":"primary.backlog.com","apiKey":"primary-key"}}}'
    );

    expect(() =>
      createBacklogClientRegistry({
        env: {
          BACKLOG_ORGANIZATIONS_CONFIG: configPath,
        },
      })
    ).toThrow(
      'BACKLOG_ORGANIZATIONS_CONFIG must point to a .yml or .yaml file.'
    );
  });
});
