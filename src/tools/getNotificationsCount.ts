import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { NotificationCountSchema } from '../types/zod/backlogOutputDefinition.js';

const getNotificationsCountSchema = buildToolSchema((t) => ({
  alreadyRead: z
    .boolean()
    .describe(
      t(
        'TOOL_GET_NOTIFICATIONS_COUNT_ALREADY_READ',
        'Whether to include already read notifications'
      )
    ),
  resourceAlreadyRead: z
    .boolean()
    .describe(
      t(
        'TOOL_GET_NOTIFICATIONS_COUNT_RESOURCE_ALREADY_READ',
        'Whether to include notifications for already read resources'
      )
    ),
}));

export const getNotificationsCountTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof getNotificationsCountSchema>,
  (typeof NotificationCountSchema)['shape']
> => {
  return {
    name: 'count_notifications',
    description: t(
      'TOOL_COUNT_NOTIFICATIONS_DESCRIPTION',
      'Returns count of notifications'
    ),
    schema: z.object(getNotificationsCountSchema(t)),
    outputSchema: NotificationCountSchema,
    handler: async (params) => backlog.getNotificationsCount(params),
  };
};
