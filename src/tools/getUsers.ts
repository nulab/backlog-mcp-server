import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { UserSchema } from '../types/zod/backlogOutputDefinition.js';

const getUsersSchema = buildToolSchema((_t) => ({}));

export const getUsersTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof getUsersSchema>,
  (typeof UserSchema)['shape']
> => {
  return {
    name: 'get_users',
    description: t(
      'TOOL_GET_USERS_DESCRIPTION',
      'Returns list of users in the Backlog space'
    ),
    schema: z.object(getUsersSchema(t)),
    outputSchema: UserSchema,
    importantFields: ['userId', 'name', 'roleType', 'lang'],
    handler: async () => backlog.getUsers(),
  };
};
