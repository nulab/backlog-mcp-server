import { describe, expect, it } from 'vitest';
import { createDescriptionHelper } from '../createDescriptionHelper.js';
import { listOrganizationsTool, organizationTools } from './organizations.js';
import { BacklogClientRegistry } from '../utils/backlogClientRegistry.js';

const registry: BacklogClientRegistry = {
  resolveClient: () => {
    throw new Error('unused');
  },
  createScopedClient: () => {
    throw new Error('unused');
  },
  listOrganizations: () => [
    { name: 'primary', domain: 'primary.backlog.com', isDefault: true },
    { name: 'secondary', domain: 'secondary.backlog.com', isDefault: false },
  ],
  getDefaultOrganization: () => 'primary',
  isMultiOrganization: true,
};

describe('listOrganizationsTool', () => {
  it('returns configured organizations and default status', async () => {
    const tool = listOrganizationsTool(registry, createDescriptionHelper().t);

    await expect(tool.handler({})).resolves.toEqual([
      { name: 'primary', domain: 'primary.backlog.com', isDefault: true },
      { name: 'secondary', domain: 'secondary.backlog.com', isDefault: false },
    ]);
  });

  // It reads a registry fixed at startup over three fields. Publishing `fields`
  // for that costs every client schema and trims nothing.
  it('does not ask for field selection', () => {
    expect(
      listOrganizationsTool(registry, createDescriptionHelper().t)
    ).toHaveProperty('returnsList', false);
  });
});

describe('organizationTools', () => {
  it('puts the tool in an enabled toolset', () => {
    const group = organizationTools(registry, createDescriptionHelper());

    expect(group.toolsets).toHaveLength(1);
    expect(group.toolsets[0].enabled).toBe(true);
    expect(group.toolsets[0].tools.map((tool) => tool.name)).toEqual([
      'list_organizations',
    ]);
  });
});
