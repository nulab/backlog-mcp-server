import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';
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
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof deleteVersionSchema>,
  Entity.Project.Version
> => {
  return {
    name: 'delete_version',
    description: t(
      'TOOL_DELETE_VERSION_DESCRIPTION',
      'Deletes a version from a project'
    ),
    schema: z.object(deleteVersionSchema(t)),
    returnsList: false,
    outputFields: outputFields<Entity.Project.Version>()([
      'id',
      'projectId',
      'name',
      'description',
      'startDate',
      'releaseDueDate',
      'archived',
      'displayOrder',
    ]),
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
