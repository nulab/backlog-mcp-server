import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { getWatchingListItems } from 'backlog-js';
import type { Client } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';

const getWatchingListItemsSchema = buildToolSchema((t) => ({
  userId: z
    .number()
    .describe(t('TOOL_GET_WATCHING_LIST_ITEMS_USER_ID', 'User ID')),
}));

export const getWatchingListItemsTool = (
  backlog: Client,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof getWatchingListItemsSchema>,
  Entity.WatchingList.WatchingListItem
> => {
  return {
    name: 'get_watching_list_items',
    description: t(
      'TOOL_GET_WATCHING_LIST_ITEMS_DESCRIPTION',
      'Returns list of watching items for a user'
    ),
    schema: z.object(getWatchingListItemsSchema(t)),
    returnsList: true,
    outputFields: outputFields<Entity.WatchingList.WatchingListItem>()([
      'id',
      'resourceAlreadyRead',
      'note',
      'type',
      'issue',
      'lastContentUpdated',
      'created',
      'updated',
    ]),
    handler: async ({ userId }) => getWatchingListItems(backlog, userId),
  };
};
