import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';

const getProjectUsersSchema = buildToolSchema((t) => ({
  projectId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_GET_PROJECT_USERS_PROJECT_ID',
        'The numeric ID of the project (e.g., 12345)'
      )
    ),
  projectKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_GET_PROJECT_USERS_PROJECT_KEY',
        "The key of the project (e.g., 'PROJECT')"
      )
    ),
}));

export const getProjectUsersTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof getProjectUsersSchema>,
  Entity.User.User
> => {
  return {
    name: 'get_project_users',
    description: t(
      'TOOL_GET_PROJECT_USERS_DESCRIPTION',
      'Returns list of users in a specific project'
    ),
    schema: z.object(getProjectUsersSchema(t)),
    returnsList: true,
    outputFields: outputFields<Entity.User.User>()([
      'id',
      'userId',
      'name',
      'roleType',
      'lang',
      'mailAddress',
      'lastLoginTime',
    ]),
    importantFields: ['userId', 'name', 'roleType', 'lang'],
    handler: async ({ projectId, projectKey }) => {
      const result = resolveIdOrKey(
        'project',
        { id: projectId, key: projectKey },
        t
      );
      if (!result.ok) {
        throw result.error;
      }
      return backlog.getProjectUsers(result.value);
    },
  };
};
