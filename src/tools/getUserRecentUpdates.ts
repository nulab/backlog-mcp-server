import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import {
  ActivitySchema,
  ActivityTypeSchema,
} from '../types/zod/backlogOutputDefinition.js';

const getUserRecentUpdatesSchema = buildToolSchema((t) => ({
  userId: z
    .number()
    .describe(
      t('TOOL_GET_USER_RECENT_UPDATES_USER_ID', 'ID of the user to retrieve activities for')
    ),
  activityTypeId: z
    .array(ActivityTypeSchema)
    .optional()
    .describe(
      t('TOOL_GET_USER_RECENT_UPDATES_ACTIVITY_TYPE_ID', 'Activity type IDs to filter by')
    ),
  minId: z
    .number()
    .optional()
    .describe(t('TOOL_GET_USER_RECENT_UPDATES_MIN_ID', 'Minimum activity ID')),
  maxId: z
    .number()
    .optional()
    .describe(t('TOOL_GET_USER_RECENT_UPDATES_MAX_ID', 'Maximum activity ID')),
  count: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .describe(
      t(
        'TOOL_GET_USER_RECENT_UPDATES_COUNT',
        'Number of activities to retrieve (1-100, default: 20)'
      )
    ),
  order: z
    .enum(['asc', 'desc'])
    .optional()
    .describe(t('TOOL_GET_USER_RECENT_UPDATES_ORDER', 'Sort order ("asc" or "desc", default: "desc")')),
}));

export const getUserRecentUpdatesTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof getUserRecentUpdatesSchema>,
  (typeof ActivitySchema)['shape']
> => {
  return {
    name: 'get_user_recent_updates',
    description: t(
      'TOOL_GET_USER_RECENT_UPDATES_DESCRIPTION',
      'Returns recent updates (activities) for a specific user'
    ),
    schema: z.object(getUserRecentUpdatesSchema(t)),
    outputSchema: ActivitySchema,
    importantFields: ['id', 'type', 'content', 'created'],
    handler: async ({ userId, activityTypeId, minId, maxId, count, order }) =>
      backlog.getUserActivities(userId, {
        activityTypeId,
        minId,
        maxId,
        count,
        order,
      }),
  };
};
