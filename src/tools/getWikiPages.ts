import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';

const getWikiPagesSchema = buildToolSchema((t) => ({
  projectId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_GET_WIKI_PAGES_PROJECT_ID',
        'The numeric ID of the project (e.g., 12345)'
      )
    ),
  projectKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_GET_WIKI_PAGES_PROJECT_KEY',
        "The key of the project (e.g., 'PROJECT')"
      )
    ),
  keyword: z
    .string()
    .optional()
    .describe(
      t('TOOL_GET_WIKI_PAGES_KEYWORD', 'Keyword to search for in Wiki pages')
    ),
}));

export const getWikiPagesTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof getWikiPagesSchema>,
  Entity.Wiki.WikiListItem
> => {
  return {
    name: 'get_wiki_pages',
    description: t(
      'TOOL_GET_WIKI_PAGES_DESCRIPTION',
      'Returns list of Wiki pages'
    ),
    schema: z.object(getWikiPagesSchema(t)),
    returnsList: true,
    outputFields: outputFields<Entity.Wiki.WikiListItem>()([
      'id',
      'projectId',
      'name',
      'tags',
      'createdUser',
      'created',
      'updatedUser',
      'updated',
    ]),
    importantFields: ['projectId', 'name', 'tags'],
    handler: async ({ projectId, projectKey, keyword }) => {
      const result = resolveIdOrKey(
        'project',
        { id: projectId, key: projectKey },
        t
      );
      if (!result.ok) {
        throw result.error;
      }
      return backlog.getWikis({
        projectIdOrKey: result.value,
        keyword,
      });
    },
  };
};
