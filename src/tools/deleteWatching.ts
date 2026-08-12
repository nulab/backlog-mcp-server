import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';

const deleteWatchingSchema = buildToolSchema((t) => ({
  watchId: z
    .number()
    .describe(t('TOOL_DELETE_WATCHING_WATCH_ID', 'Watch ID to delete')),
}));

export const deleteWatchingTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof deleteWatchingSchema>,
  Entity.WatchingList.WatchingListItem
> => {
  return {
    name: 'delete_watching',
    description: t(
      'TOOL_DELETE_WATCHING_DESCRIPTION',
      'Deletes a watch from an issue'
    ),
    schema: z.object(deleteWatchingSchema(t)),
    returnsList: false,
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
    handler: async ({ watchId }) => backlog.deletehWatchingListItem(watchId),
  };
};
