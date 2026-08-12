import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';

const getWatchingListCountSchema = buildToolSchema((t) => ({
  userId: z
    .number()
    .describe(t('TOOL_GET_WATCHING_LIST_COUNT_USER_ID', 'User ID')),
}));

export const getWatchingListCountTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof getWatchingListCountSchema>,
  Entity.WatchingList.WatchingListCount
> => {
  return {
    name: 'get_watching_list_count',
    description: t(
      'TOOL_GET_WATCHING_LIST_COUNT_DESCRIPTION',
      'Returns count of watching items for a user'
    ),
    schema: z.object(getWatchingListCountSchema(t)),
    returnsList: false,
    outputFields: outputFields<Entity.WatchingList.WatchingListCount>()([
      'count',
    ]),
    handler: async ({ userId }) => backlog.getWatchingListCount(userId),
  };
};
