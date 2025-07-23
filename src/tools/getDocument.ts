import { Backlog } from 'backlog-js';
import { z } from 'zod';
import { TranslationHelper } from '../createTranslationHelper.js';
import { DocumentItemSchema } from '../types/zod/backlogOutputDefinition.js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';

const getDocumentSchema = buildToolSchema((t) => ({
  documentId: z
    .string()
    .describe(t('TOOL_GET_DOCUMENT_DOCUMENT_ID', 'Document ID')),
}));

export const getDocumentTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof getDocumentSchema>,
  (typeof DocumentItemSchema)['shape']
> => {
  return {
    name: 'get_document',
    description: t(
      'TOOL_GET_DOCUMENT_DESCRIPTION',
      'Gets information about a document.'
    ),
    schema: z.object(getDocumentSchema(t)),
    outputSchema: DocumentItemSchema,
    importantFields: ['id', 'title', 'createdUser'],
    handler: async ({ documentId }) => {
      return backlog.getDocument(documentId);
    },
  };
};
