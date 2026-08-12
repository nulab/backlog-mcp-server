import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';

const resetUnreadNotificationCountSchema = buildToolSchema((_t) => ({}));

export const resetUnreadNotificationCountTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof resetUnreadNotificationCountSchema>,
  Entity.Notification.NotificationCount
> => {
  return {
    name: 'reset_unread_notification_count',
    description: t(
      'TOOL_RESET_UNREAD_NOTIFICATION_COUNT_DESCRIPTION',
      'Reset unread notification count'
    ),
    schema: z.object(resetUnreadNotificationCountSchema(t)),
    returnsList: false,
    outputFields: outputFields<Entity.Notification.NotificationCount>()([
      'count',
    ]),
    handler: async () => backlog.resetNotificationsMarkAsRead(),
  };
};
