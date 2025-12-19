import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { WatchingListItemSchema } from '../types/zod/backlogOutputDefinition.js';

const addWatchingSchema = buildToolSchema((t) => ({
  issueIdOrKey: z
    .union([z.number(), z.string()])
    .describe(
      t(
        'TOOL_ADD_WATCHING_ISSUE_ID_OR_KEY',
        'Issue ID or issue key (e.g., 1234 or "PROJECT-123")'
      )
    ),
  note: z
    .string()
    .describe(t('TOOL_ADD_WATCHING_NOTE', 'Optional note for the watch'))
    .optional()
    .default(''),
}));

export const addWatchingTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof addWatchingSchema>,
  (typeof WatchingListItemSchema)['shape']
> => {
  return {
    name: 'add_watching',
    description: t(
      'TOOL_ADD_WATCHING_DESCRIPTION',
      'Adds a new watch to an issue'
    ),
    schema: z.object(addWatchingSchema(t)),
    outputSchema: WatchingListItemSchema,
    handler: async ({ issueIdOrKey, note }) =>
      backlog.postWatchingListItem({
        issueIdOrKey,
        note,
      }),
  };
};
