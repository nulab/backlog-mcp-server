import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { WatchingListCountSchema } from '../types/zod/backlogOutputDefinition.js';

const getWatchingListCountSchema = buildToolSchema((t) => ({
  userId: z
    .number()
    .describe(t('TOOL_GET_WATCHING_LIST_COUNT_USER_ID', 'User ID')),
}));

export const getWatchingListCountTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof getWatchingListCountSchema>,
  (typeof WatchingListCountSchema)['shape']
> => {
  return {
    name: 'get_watching_list_count',
    description: t(
      'TOOL_GET_WATCHING_LIST_COUNT_DESCRIPTION',
      'Returns count of watching items for a user'
    ),
    schema: z.object(getWatchingListCountSchema(t)),
    outputSchema: WatchingListCountSchema,
    handler: async ({ userId }) => backlog.getWatchingListCount(userId),
  };
};
