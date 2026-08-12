import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { ProjectSchema } from '../types/zod/backlogOutputDefinition.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';

const deleteProjectSchema = buildToolSchema((t) => ({
  projectId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_DELETE_PROJECT_PROJECT_ID',
        'The numeric ID of the project (e.g., 12345)'
      )
    ),
  projectKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_DELETE_PROJECT_PROJECT_KEY',
        "The key of the project (e.g., 'PROJECT')"
      )
    ),
}));

export const deleteProjectTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof deleteProjectSchema>,
  (typeof ProjectSchema)['shape']
> => {
  return {
    name: 'delete_project',
    description: t('TOOL_DELETE_PROJECT_DESCRIPTION', 'Deletes a project'),
    schema: z.object(deleteProjectSchema(t)),
    returnsList: false,
    outputSchema: ProjectSchema,
    handler: async ({ projectId, projectKey }) => {
      const result = resolveIdOrKey(
        'project',
        { id: projectId, key: projectKey },
        t
      );
      if (!result.ok) {
        throw result.error;
      }
      return backlog.deleteProject(result.value);
    },
  };
};
