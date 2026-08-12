import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';

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
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof getNotificationsSchema>,
  Entity.Notification.Notification
> => {
  return {
    name: 'get_notifications',
    description: t(
      'TOOL_GET_NOTIFICATIONS_DESCRIPTION',
      'Returns list of notifications'
    ),
    schema: z.object(getNotificationsSchema(t)),
    returnsList: true,
    outputFields: outputFields<Entity.Notification.Notification>()([
      'id',
      'alreadyRead',
      'reason',
      'resourceAlreadyRead',
      'project',
      'issue',
      'comment',
      'pullRequest',
      'pullRequestComment',
      'sender',
      'created',
    ]),
    handler: async ({ minId, maxId, count, order }) =>
      backlog.getNotifications({
        minId,
        maxId,
        count,
        order,
      }),
  };
};
