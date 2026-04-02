import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { WikiFileInfoSchema } from '../types/zod/backlogOutputDefinition.js';

const getWikiAttachmentsSchema = buildToolSchema((t) => ({
  wikiId: z
    .number()
    .describe(
      t('TOOL_GET_WIKI_ATTACHMENTS_WIKI_ID', 'The numeric ID of the wiki page')
    ),
}));

export const getWikiAttachmentsTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof getWikiAttachmentsSchema>,
  (typeof WikiFileInfoSchema)['shape']
> => {
  return {
    name: 'get_wiki_attachments',
    description: t(
      'TOOL_GET_WIKI_ATTACHMENTS_DESCRIPTION',
      'Returns list of attachments for a wiki page'
    ),
    schema: z.object(getWikiAttachmentsSchema(t)),
    outputSchema: WikiFileInfoSchema,
    handler: async ({ wikiId }) => {
      return backlog.getWikisAttachments(wikiId);
    },
  };
};
