import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';

const getWikiSchema = buildToolSchema((t) => ({
  wikiId: z
    .union([z.string(), z.number()])
    .describe(t('TOOL_GET_WIKI_ID', 'Wiki ID')),
}));

export const getWikiTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<ReturnType<typeof getWikiSchema>, Entity.Wiki.Wiki> => {
  return {
    name: 'get_wiki',
    description: t(
      'TOOL_GET_WIKI_DESCRIPTION',
      'Returns information about a specific wiki page'
    ),
    schema: z.object(getWikiSchema(t)),
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
    importantFields: ['id', 'projectId', 'name', 'content'],
    handler: async ({ wikiId }) => {
      const wikiIdNumber =
        typeof wikiId === 'string' ? parseInt(wikiId, 10) : wikiId;
      return backlog.getWiki(wikiIdNumber);
    },
  };
};
