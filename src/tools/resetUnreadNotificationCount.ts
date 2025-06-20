import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { NotificationCountSchema } from '../types/zod/backlogOutputDefinition.js';

const resetUnreadNotificationCountSchema = buildToolSchema((_t) => ({}));

export const resetUnreadNotificationCountTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof resetUnreadNotificationCountSchema>,
  (typeof NotificationCountSchema)['shape']
> => {
  return {
    name: 'reset_unread_notification_count',
    description: t(
      'TOOL_RESET_UNREAD_NOTIFICATION_COUNT_DESCRIPTION',
      'Reset unread notification count'
    ),
    schema: z.object(resetUnreadNotificationCountSchema(t)),
    outputSchema: NotificationCountSchema,
    handler: async () => backlog.resetNotificationsMarkAsRead(),
  };
};
