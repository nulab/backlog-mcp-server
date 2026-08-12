import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';

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
  { t }: DescriptionHelper
): ToolDefinition<ReturnType<typeof addWikiSchema>, Entity.Wiki.Wiki> => {
  return {
    name: 'add_wiki',
    description: t('TOOL_ADD_WIKI_DESCRIPTION', 'Creates a new wiki page'),
    schema: z.object(addWikiSchema(t)),
    returnsList: false,
    outputFields: outputFields<Entity.Wiki.Wiki>()([
      'id',
      'projectId',
      'name',
      'content',
      'tags',
      'attachments',
      'sharedFiles',
      'stars',
      'createdUser',
      'created',
      'updatedUser',
      'updated',
    ]),
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
