import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';

const markWatchingAsReadSchema = buildToolSchema((t) => ({
  watchId: z
    .number()
    .describe(
      t('TOOL_MARK_WATCHING_AS_READ_WATCH_ID', 'Watch ID to mark as read')
    ),
}));

export const MarkWatchingAsReadResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const markWatchingAsReadTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof markWatchingAsReadSchema>,
  (typeof MarkWatchingAsReadResultSchema)['shape']
> => {
  return {
    name: 'mark_watching_as_read',
    description: t(
      'TOOL_MARK_WATCHING_AS_READ_DESCRIPTION',
      'Mark a watch as read'
    ),
    schema: z.object(markWatchingAsReadSchema(t)),
    outputSchema: MarkWatchingAsReadResultSchema,
    handler: async ({ watchId }) => {
      await backlog.resetWatchingListItemAsRead(watchId);
      return {
        success: true,
        message: `Watch ${watchId} marked as read`,
      };
    },
  };
};
