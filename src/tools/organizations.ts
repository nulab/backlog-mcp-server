import { z } from 'zod';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import {
  BacklogClientRegistry,
  BacklogOrganizationInfo,
} from '../utils/backlogClientRegistry.js';
import { ToolDefinition } from '../types/tool.js';
import { ToolsetGroup } from '../types/toolsets.js';

type OrganizationOutput = {
  name: string;
  domain: string;
  isDefault: boolean;
};

export function organizationTools(
  registry: BacklogClientRegistry,
  { t }: DescriptionHelper
): ToolsetGroup {
  return {
    toolsets: [
      {
        name: 'organization_metadata',
        description: 'Tools for inspecting configured Backlog organizations.',
        enabled: true,
        tools: [listOrganizationsTool(registry, t)],
      },
    ],
  };
}

export function listOrganizationsTool(
  registry: BacklogClientRegistry,
  t: DescriptionHelper['t']
): ToolDefinition<Record<string, never>, OrganizationOutput> {
  return {
    name: 'list_organizations',
    description: t(
      'TOOL_LIST_ORGANIZATIONS_DESCRIPTION',
      'List configured Backlog organizations and identify the default organization.'
    ),
    schema: z.object({}),
    outputFields: ['name', 'domain', 'isDefault'],
    // False despite returning an array: the list is bounded by the configured spaces,
    // so a `fields` enum would cost every client schema to trim nothing.
    returnsList: false,
    handler: async () => registry.listOrganizations().map(toToolOutput),
  };
}

function toToolOutput(
  organization: BacklogOrganizationInfo
): OrganizationOutput {
  return {
    name: organization.name,
    domain: organization.domain,
    isDefault: organization.isDefault,
  };
}
