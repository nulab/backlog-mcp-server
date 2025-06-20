import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { UserSchema } from '../types/zod/backlogOutputDefinition.js';

const getMyselfSchema = buildToolSchema((_t) => ({}));

export const getMyselfTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof getMyselfSchema>,
  (typeof UserSchema)['shape']
> => {
  return {
    name: 'get_myself',
    description: t(
      'TOOL_GET_MYSELF_DESCRIPTION',
      'Returns information about the authenticated user'
    ),
    schema: z.object(getMyselfSchema(t)),
    outputSchema: UserSchema,
    importantFields: ['id', 'userId', 'name', 'roleType'],
    handler: async () => backlog.getMyself(),
  };
};
