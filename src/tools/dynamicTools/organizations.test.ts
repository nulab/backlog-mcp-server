import { describe, expect, it } from 'vitest';
import { createTranslationHelper } from '../../createTranslationHelper.js';
import { organizationTools } from './organizations.js';
import { BacklogClientRegistry } from '../../utils/backlogClientRegistry.js';

describe('organizationTools', () => {
  it('returns configured organizations and default status', async () => {
    const registry: BacklogClientRegistry = {
      resolveClient: () => {
        throw new Error('unused');
      },
      createScopedClient: () => {
        throw new Error('unused');
      },
      listOrganizations: () => [
        { name: 'primary', domain: 'primary.backlog.com', isDefault: true },
        {
          name: 'secondary',
          domain: 'secondary.backlog.com',
          isDefault: false,
        },
      ],
      getDefaultOrganization: () => 'primary',
    };

    const group = organizationTools(registry, createTranslationHelper());
    const tool = group.toolsets[0].tools[0];
    const result = await tool.handler({});
    const content = result.content[0];

    expect(content.type).toBe('text');
    if (content.type === 'text') {
      expect(JSON.parse(content.text)).toEqual([
        {
          name: 'primary',
          domain: 'primary.backlog.com',
          isDefault: true,
        },
        {
          name: 'secondary',
          domain: 'secondary.backlog.com',
          isDefault: false,
        },
      ]);
    }
  });
});
