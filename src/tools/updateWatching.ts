import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { patchWatchingListItem } from 'backlog-js';
import type { Client } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';

const updateWatchingSchema = buildToolSchema((t) => ({
  watchId: z.number().describe(t('TOOL_UPDATE_WATCHING_WATCH_ID', 'Watch ID')),
  note: z
    .string()
    .describe(t('TOOL_UPDATE_WATCHING_NOTE', 'Updated note for the watch')),
}));

export const updateWatchingTool = (
  backlog: Client,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof updateWatchingSchema>,
  Entity.WatchingList.WatchingListItem
> => {
  return {
    name: 'update_watching',
    description: t(
      'TOOL_UPDATE_WATCHING_DESCRIPTION',
      'Updates an existing watch note'
    ),
    schema: z.object(updateWatchingSchema(t)),
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
    handler: async ({ watchId, note }) =>
      patchWatchingListItem(backlog, watchId, note),
  };
};
