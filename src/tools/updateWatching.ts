import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { WatchingListItemSchema } from '../types/zod/backlogOutputDefinition.js';

const updateWatchingSchema = buildToolSchema((t) => ({
  watchId: z.number().describe(t('TOOL_UPDATE_WATCHING_WATCH_ID', 'Watch ID')),
  note: z
    .string()
    .describe(t('TOOL_UPDATE_WATCHING_NOTE', 'Updated note for the watch')),
}));

export const updateWatchingTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof updateWatchingSchema>,
  (typeof WatchingListItemSchema)['shape']
> => {
  return {
    name: 'update_watching',
    description: t(
      'TOOL_UPDATE_WATCHING_DESCRIPTION',
      'Updates an existing watch note'
    ),
    schema: z.object(updateWatchingSchema(t)),
    outputSchema: WatchingListItemSchema,
    handler: async ({ watchId, note }) =>
      backlog.patchWatchingListItem(watchId, note),
  };
};
