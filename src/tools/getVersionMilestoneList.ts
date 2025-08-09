import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { VersionSchema } from '../types/zod/backlogOutputDefinition.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';

const getVersionMilestoneListSchema = buildToolSchema((t) => ({
  projectId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_GET_VERSION_MILESTONE_PROJECT_ID',
        'The numeric ID of the project (e.g., 12345)'
      )
    ),
  projectKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_GET_VERSION_MILESTONE_PROJECT_KEY',
        'The key of the project (e.g., TEST_PROJECT)'
      )
    ),
}));

export const getVersionMilestoneListTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof getVersionMilestoneListSchema>,
  (typeof VersionSchema)['shape']
> => {
  return {
    name: 'get_version_milestone_list',
    description: t(
      'TOOL_GET_VERSION_MILESTONE_LIST_DESCRIPTION',
      'Returns list of versions/milestones in the Backlog space'
    ),
    schema: z.object(getVersionMilestoneListSchema(t)),
    outputSchema: VersionSchema,
    importantFields: [
      'id',
      'name',
      'description',
      'startDate',
      'releaseDueDate',
      'archived',
    ],
    handler: async ({ projectId, projectKey }) => {
      const result = resolveIdOrKey(
        'project',
        { id: projectId, key: projectKey },
        t
      );
      if (!result.ok) {
        throw result.error;
      }
      return backlog.getVersions(result.value);
    },
  };
};
