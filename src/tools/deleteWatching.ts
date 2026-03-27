import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { WatchingListItemSchema } from '../types/zod/backlogOutputDefinition.js';

const deleteWatchingSchema = buildToolSchema((t) => ({
  watchId: z
    .number()
    .describe(t('TOOL_DELETE_WATCHING_WATCH_ID', 'Watch ID to delete')),
}));

export const deleteWatchingTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof deleteWatchingSchema>,
  (typeof WatchingListItemSchema)['shape']
> => {
  return {
    name: 'delete_watching',
    description: t(
      'TOOL_DELETE_WATCHING_DESCRIPTION',
      'Deletes a watch from an issue'
    ),
    schema: z.object(deleteWatchingSchema(t)),
    outputSchema: WatchingListItemSchema,
    handler: async ({ watchId }) => backlog.deletehWatchingListItem(watchId),
  };
};
