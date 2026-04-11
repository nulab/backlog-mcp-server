import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { WatchingListItemSchema } from '../types/zod/backlogOutputDefinition.js';

const getWatchingListItemsSchema = buildToolSchema((t) => ({
  userId: z
    .number()
    .describe(t('TOOL_GET_WATCHING_LIST_ITEMS_USER_ID', 'User ID')),
}));

export const getWatchingListItemsTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof getWatchingListItemsSchema>,
  (typeof WatchingListItemSchema)['shape']
> => {
  return {
    name: 'get_watching_list_items',
    description: t(
      'TOOL_GET_WATCHING_LIST_ITEMS_DESCRIPTION',
      'Returns list of watching items for a user'
    ),
    schema: z.object(getWatchingListItemsSchema(t)),
    outputSchema: WatchingListItemSchema,
    handler: async ({ userId }) => backlog.getWatchingListItems(userId),
  };
};
