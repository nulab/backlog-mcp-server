import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { getNotificationsCount } from 'backlog-js';
import type { Client } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';

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
  backlog: Client,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof getNotificationsCountSchema>,
  Entity.Notification.NotificationCount
> => {
  return {
    name: 'count_notifications',
    description: t(
      'TOOL_COUNT_NOTIFICATIONS_DESCRIPTION',
      'Returns count of notifications'
    ),
    schema: z.object(getNotificationsCountSchema(t)),
    returnsList: false,
    outputFields: outputFields<Entity.Notification.NotificationCount>()([
      'count',
    ]),
    handler: async (params) => getNotificationsCount(backlog, params),
  };
};
