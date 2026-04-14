import { z } from 'zod';
import { TranslationHelper } from '../../createTranslationHelper.js';
import {
  BacklogClientRegistry,
  BacklogOrganizationInfo,
} from '../../utils/backlogClientRegistry.js';
import { DynamicToolDefinition } from '../../types/tool.js';
import { DynamicToolsetGroup } from '../../types/toolsets.js';

export function organizationTools(
  registry: BacklogClientRegistry,
  { t }: TranslationHelper
): DynamicToolsetGroup {
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
  t: TranslationHelper['t']
): DynamicToolDefinition<Record<string, never>> {
  return {
    name: 'list_organizations',
    description: t(
      'TOOL_LIST_ORGANIZATIONS_DESCRIPTION',
      'List configured Backlog organizations and identify the default organization.'
    ),
    schema: z.object({}),
    handler: async () => {
      const organizations = registry.listOrganizations().map(toToolOutput);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(organizations, null, 2),
          },
        ],
      };
    },
  };
}

function toToolOutput(organization: BacklogOrganizationInfo) {
  return {
    name: organization.name,
    domain: organization.domain,
    isDefault: organization.isDefault,
  };
}
