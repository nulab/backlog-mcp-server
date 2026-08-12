import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';

const getWikisCountSchema = buildToolSchema((t) => ({
  projectId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_GET_WIKIS_COUNT_PROJECT_ID',
        'The numeric ID of the project (e.g., 12345)'
      )
    ),
  projectKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_GET_WIKIS_COUNT_PROJECT_KEY',
        "The key of the project (e.g., 'PROJECT')"
      )
    ),
}));

export const getWikisCountTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof getWikisCountSchema>,
  Entity.Wiki.WikiCount
> => {
  return {
    name: 'get_wikis_count',
    description: t(
      'TOOL_GET_WIKIS_COUNT_DESCRIPTION',
      'Returns count of wiki pages in a project'
    ),
    schema: z.object(getWikisCountSchema(t)),
    returnsList: false,
    outputFields: outputFields<Entity.Wiki.WikiCount>()(['count']),
    handler: async ({ projectId, projectKey }) => {
      const result = resolveIdOrKey(
        'project',
        { id: projectId, key: projectKey },
        t
      );
      if (!result.ok) {
        throw result.error;
      }
      return backlog.getWikisCount(result.value);
    },
  };
};
