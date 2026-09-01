import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { z } from 'zod';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';

const getDocumentSchema = buildToolSchema((t) => ({
  documentId: z
    .string()
    .describe(t('TOOL_GET_DOCUMENT_DOCUMENT_ID', 'Document ID')),
}));

export const getDocumentTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof getDocumentSchema>,
  Entity.Document.Document
> => {
  return {
    name: 'get_document',
    description: t(
      'TOOL_GET_DOCUMENT_DESCRIPTION',
      'Gets information about a document.'
    ),
    schema: z.object(getDocumentSchema(t)),
    returnsList: false,
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
      'childDocumentIds',
    ]),
    importantFields: ['id', 'title', 'createdUser'],
    handler: async ({ documentId }) => {
      return backlog.getDocument(documentId);
    },
  };
};
