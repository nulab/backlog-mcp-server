import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';

const getUsersSchema = buildToolSchema((_t) => ({}));

export const getUsersTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<ReturnType<typeof getUsersSchema>, Entity.User.User> => {
  return {
    name: 'get_users',
    description: t(
      'TOOL_GET_USERS_DESCRIPTION',
      'Returns list of users in the Backlog space'
    ),
    schema: z.object(getUsersSchema(t)),
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
    handler: async () => backlog.getUsers(),
  };
};
