import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { getProjectStatuses } from 'backlog-js';
import type { Client } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';

const getStatusesSchema = buildToolSchema((t) => ({
  projectId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_GET_STATUSES_PROJECT_ID',
        'The numeric ID of the project (e.g., 12345)'
      )
    ),
  projectKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_GET_STATUSES_PROJECT_KEY',
        "The key of the project (e.g., 'PROJECT')"
      )
    ),
}));

export const getStatusesTool = (
  backlog: Client,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof getStatusesSchema>,
  Entity.Project.ProjectStatus
> => {
  return {
    name: 'get_statuses',
    description: t(
      'TOOL_GET_STATUSES_DESCRIPTION',
      'Returns list of statuses for a project'
    ),
    schema: z.object(getStatusesSchema(t)),
    returnsList: true,
    outputFields: outputFields<Entity.Project.ProjectStatus>()([
      'id',
      'projectId',
      'name',
      'color',
      'displayOrder',
    ]),
    importantFields: ['id', 'projectId', 'name'],
    handler: async ({ projectId, projectKey }) => {
      const result = resolveIdOrKey(
        'project',
        { id: projectId, key: projectKey },
        t
      );
      if (!result.ok) {
        throw result.error;
      }
      return getProjectStatuses(backlog, result.value);
    },
  };
};
