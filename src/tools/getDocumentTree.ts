import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { z } from 'zod';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';

const getDocumentTreeSchema = buildToolSchema((t) => ({
  projectIdOrKey: z
    .union([z.string(), z.number()])
    .describe(
      t('TOOL_GET_DOCUMENT_TREE_PROJECT_ID_OR_KEY', 'Project ID or Key')
    ),
}));

export const getDocumentTreeTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof getDocumentTreeSchema>,
  Entity.Document.DocumentTree
> => {
  return {
    name: 'get_document_tree',
    description: t(
      'TOOL_GET_DOCUMENT_TREE_DESCRIPTION',
      'Gets the document tree of a project.'
    ),
    schema: z.object(getDocumentTreeSchema(t)),
    returnsList: false,
    outputFields: outputFields<Entity.Document.DocumentTree>()([
      'projectId',
      'activeTree',
      'trashTree',
    ]),
    importantFields: ['projectId', 'activeTree', 'trashTree'],
    handler: async ({ projectIdOrKey }) => {
      return backlog.getDocumentTree(projectIdOrKey);
    },
  };
};
