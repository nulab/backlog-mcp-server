import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';

/** This tool reports its own outcome; the Backlog call returns nothing. */
type MarkNotificationAsReadResult = { success: boolean; message: string };
import { DescriptionHelper } from '../createDescriptionHelper.js';

const markNotificationAsReadSchema = buildToolSchema((t) => ({
  id: z
    .number()
    .describe(
      t('TOOL_MARK_NOTIFICATION_AS_READ_ID', 'Notification ID to mark as read')
    ),
}));

export const MarkNotificationAsReadResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const markNotificationAsReadTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof markNotificationAsReadSchema>,
  MarkNotificationAsReadResult
> => {
  return {
    name: 'mark_notification_as_read',
    description: t(
      'TOOL_MARK_NOTIFICATION_AS_READ_DESCRIPTION',
      'Mark a notification as read'
    ),
    schema: z.object(markNotificationAsReadSchema(t)),
    returnsList: false,
    outputFields: outputFields<MarkNotificationAsReadResult>()([
      'success',
      'message',
    ]),
    handler: async ({ id }) => {
      await backlog.markAsReadNotification(id);
      return {
        success: true,
        message: `Notification ${id} marked as read`,
      };
    },
  };
};
