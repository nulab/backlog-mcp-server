import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { WikiSchema } from '../types/zod/backlogOutputDefinition.js';

const updateWikiSchema = buildToolSchema((t) => ({
  wikiId: z
    .union([z.string(), z.number()])
    .describe(t('TOOL_UPDATE_WIKI_ID', 'Wiki ID')),
  name: z
    .string()
    .optional()
    .describe(t('TOOL_UPDATE_WIKI_NAME', 'Name of the wiki page')),
  content: z
    .string()
    .optional()
    .describe(t('TOOL_UPDATE_WIKI_CONTENT', 'Content of the wiki page')),
  mailNotify: z
    .boolean()
    .optional()
    .describe(
      t(
        'TOOL_UPDATE_WIKI_MAIL_NOTIFY',
        'Whether to send notification emails (default: false)'
      )
    ),
}));

export const updateWikiTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof updateWikiSchema>,
  (typeof WikiSchema)['shape']
> => {
  return {
    name: 'update_wiki',
    description: t(
      'TOOL_UPDATE_WIKI_DESCRIPTION',
      'Updates an existing wiki page'
    ),
    schema: z.object(updateWikiSchema(t)),
    outputSchema: WikiSchema,
    importantFields: ['id', 'name', 'content', 'updatedUser'],
    handler: async ({ wikiId, name, content, mailNotify }) => {
      const wikiIdNumber =
        typeof wikiId === 'string' ? parseInt(wikiId, 10) : wikiId;

      return backlog.patchWiki(wikiIdNumber, {
        name,
        content,
        mailNotify,
      });
    },
  };
};
