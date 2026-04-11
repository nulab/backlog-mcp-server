import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { NotificationSchema } from '../types/zod/backlogOutputDefinition.js';

const getNotificationsSchema = buildToolSchema((t) => ({
  minId: z
    .number()
    .optional()
    .describe(t('TOOL_GET_NOTIFICATIONS_MIN_ID', 'Minimum notification ID')),
  maxId: z
    .number()
    .optional()
    .describe(t('TOOL_GET_NOTIFICATIONS_MAX_ID', 'Maximum notification ID')),
  count: z
    .number()
    .optional()
    .describe(
      t('TOOL_GET_NOTIFICATIONS_COUNT', 'Number of notifications to retrieve')
    ),
  order: z
    .enum(['asc', 'desc'])
    .optional()
    .describe(t('TOOL_GET_NOTIFICATIONS_ORDER', 'Sort order')),
}));

export const getNotificationsTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof getNotificationsSchema>,
  (typeof NotificationSchema)['shape']
> => {
  return {
    name: 'get_notifications',
    description: t(
      'TOOL_GET_NOTIFICATIONS_DESCRIPTION',
      'Returns list of notifications'
    ),
    schema: z.object(getNotificationsSchema(t)),
    outputSchema: NotificationSchema,
    handler: async ({ minId, maxId, count, order }) =>
      backlog.getNotifications({
        minId,
        maxId,
        count,
        order,
      }),
  };
};
