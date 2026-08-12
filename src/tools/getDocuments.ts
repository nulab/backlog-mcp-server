import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { z } from 'zod';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';

const getDocumentsSchema = buildToolSchema((t) => ({
  projectIds: z
    .array(z.number())
    .describe(t('TOOL_GET_DOCUMENTS_PROJECT_ID_LIST', 'Project ID List')),
  offset: z
    .number()
    .optional()
    .default(0)
    .describe(
      t('TOOL_GET_DOCUMENTS_OFFSET', 'Offset for pagination (default is 0)')
    ),
}));

export const getDocumentsTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof getDocumentsSchema>,
  Entity.Document.Document
> => {
  return {
    name: 'get_documents',
    description: t(
      'TOOL_GET_DOCUMENTS_DESCRIPTION',
      'Gets a list of documents in a project.'
    ),
    schema: z.object(getDocumentsSchema(t)),
    returnsList: true,
    outputFields: outputFields<Entity.Document.Document>()([
      'id',
      'projectId',
      'title',
      'plain',
      'json',
      'statusId',
      'emoji',
      'attachments',
      'tags',
      'createdUser',
      'created',
      'updatedUser',
      'updated',
    ]),
    importantFields: ['id', 'projectId', 'title', 'plain'],
    handler: async ({ projectIds, offset }) => {
      return backlog.getDocuments({ projectId: projectIds, offset });
    },
  };
};
