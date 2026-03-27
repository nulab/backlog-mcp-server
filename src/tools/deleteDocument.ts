import { Backlog } from 'backlog-js';
import { z } from 'zod';
import { TranslationHelper } from '../createTranslationHelper.js';
import { DocumentItemSchema } from '../types/zod/backlogOutputDefinition.js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';

const deleteDocumentSchema = buildToolSchema((t) => ({
  documentId: z
    .string()
    .describe(t('TOOL_DELETE_DOCUMENT_DOCUMENT_ID', 'Document ID')),
}));

export const deleteDocumentTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof deleteDocumentSchema>,
  (typeof DocumentItemSchema)['shape']
> => {
  return {
    name: 'delete_document',
    description: t(
      'TOOL_DELETE_DOCUMENT_DESCRIPTION',
      'Permanently deletes a document. This is irreversible (hard delete) and the document cannot be recovered. Unlike the Backlog UI trash feature, this operation does not move the document to trash.'
    ),
    schema: z.object(deleteDocumentSchema(t)),
    outputSchema: DocumentItemSchema,
    handler: async ({ documentId }) => {
      return backlog.deleteDocument(documentId);
    },
  };
};
