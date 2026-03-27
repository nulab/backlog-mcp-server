import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { WikiSchema } from '../types/zod/backlogOutputDefinition.js';

const addWikiSchema = buildToolSchema((t) => ({
  projectId: z.number().describe(t('TOOL_ADD_WIKI_PROJECT_ID', 'Project ID')),
  name: z.string().describe(t('TOOL_ADD_WIKI_NAME', 'Name of the wiki page')),
  content: z
    .string()
    .describe(t('TOOL_ADD_WIKI_CONTENT', 'Content of the wiki page')),
  mailNotify: z
    .boolean()
    .optional()
    .describe(
      t(
        'TOOL_ADD_WIKI_MAIL_NOTIFY',
        'Whether to send notification emails (default: false)'
      )
    ),
}));

export const addWikiTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof addWikiSchema>,
  (typeof WikiSchema)['shape']
> => {
  return {
    name: 'add_wiki',
    description: t('TOOL_ADD_WIKI_DESCRIPTION', 'Creates a new wiki page'),
    schema: z.object(addWikiSchema(t)),
    outputSchema: WikiSchema,
    importantFields: ['id', 'name', 'content', 'createdUser'],
    handler: async ({ projectId, name, content, mailNotify }) =>
      backlog.postWiki({
        projectId,
        name,
        content,
        mailNotify,
      }),
  };
};
