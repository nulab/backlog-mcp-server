import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';

const getMyselfSchema = buildToolSchema((_t) => ({}));

export const getMyselfTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<ReturnType<typeof getMyselfSchema>, Entity.User.User> => {
  return {
    name: 'get_myself',
    description: t(
      'TOOL_GET_MYSELF_DESCRIPTION',
      'Returns information about the authenticated user'
    ),
    schema: z.object(getMyselfSchema(t)),
    returnsList: false,
    outputFields: outputFields<Entity.User.User>()([
      'id',
      'userId',
      'name',
      'roleType',
      'lang',
      'mailAddress',
      'lastLoginTime',
    ]),
    importantFields: ['id', 'userId', 'name', 'roleType'],
    handler: async () => backlog.getMyself(),
  };
};
