import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { StarCountSchema } from '../types/zod/backlogOutputDefinition.js';

const getUserStarsCountSchema = buildToolSchema((t) => ({
  userId: z
    .number()
    .describe(t('TOOL_GET_USER_STARS_COUNT_USER_ID', 'User ID')),
  since: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_GET_USER_STARS_COUNT_SINCE',
        'Count stars received after this date (yyyy-MM-dd)'
      )
    ),
  until: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_GET_USER_STARS_COUNT_UNTIL',
        'Count stars received before this date (yyyy-MM-dd)'
      )
    ),
}));

export const getUserStarsCountTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof getUserStarsCountSchema>,
  (typeof StarCountSchema)['shape']
> => {
  return {
    name: 'get_user_stars_count',
    description: t(
      'TOOL_GET_USER_STARS_COUNT_DESCRIPTION',
      'Returns number of stars that user received'
    ),
    schema: z.object(getUserStarsCountSchema(t)),
    outputSchema: StarCountSchema,
    handler: async ({ userId, since, until }) =>
      backlog.getUserStarsCount(userId, { since, until }),
  };
};
