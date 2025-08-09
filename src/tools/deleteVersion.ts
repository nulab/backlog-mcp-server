import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { VersionSchema } from '../types/zod/backlogOutputDefinition.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';

const deleteVersionSchema = buildToolSchema((t) => ({
  projectId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_DELETE_VERSION_PROJECT_ID',
        'The numeric ID of the project (e.g., 12345)'
      )
    ),
  projectKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_DELETE_VERSION_PROJECT_KEY',
        "The key of the project (e.g., 'PROJECT')"
      )
    ),
  id: z
    .number()
    .describe(
      t(
        'TOOL_DELETE_VERSION_ID',
        'The numeric ID of the version to delete (e.g., 67890)'
      )
    ),
}));

export const deleteVersionTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof deleteVersionSchema>,
  (typeof VersionSchema)['shape']
> => {
  return {
    name: 'delete_version',
    description: t(
      'TOOL_DELETE_VERSION_DESCRIPTION',
      'Deletes a version from a project'
    ),
    schema: z.object(deleteVersionSchema(t)),
    outputSchema: VersionSchema,
    handler: async ({ projectId, projectKey, id }) => {
      const result = resolveIdOrKey(
        'project',
        { id: projectId, key: projectKey },
        t
      );
      if (!result.ok) {
        throw result.error;
      }
      if (!id) {
        throw new Error(
          t('TOOL_DELETE_VERSION_MISSING_ID', 'Version ID is required')
        );
      }
      return backlog.deleteVersions(result.value, id);
    },
  };
};
