import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';

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
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof getUserStarsCountSchema>,
  Entity.Star.StarCount
> => {
  return {
    name: 'get_user_stars_count',
    description: t(
      'TOOL_GET_USER_STARS_COUNT_DESCRIPTION',
      'Returns the count of stars received by a user'
    ),
    schema: z.object(getUserStarsCountSchema(t)),
    returnsList: false,
    outputFields: outputFields<Entity.Star.StarCount>()(['count']),
    handler: async ({ userId, since, until }) =>
      backlog.getUserStarsCount(userId, { since, until }),
  };
};
