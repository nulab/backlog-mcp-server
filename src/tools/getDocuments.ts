import { Backlog } from 'backlog-js';
import { z } from 'zod';
import { TranslationHelper } from '../createTranslationHelper.js';
import { DocumentItemSchema } from '../types/zod/backlogOutputDefinition.js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';

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
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof getDocumentsSchema>,
  (typeof DocumentItemSchema)['shape']
> => {
  return {
    name: 'get_documents',
    description: t(
      'TOOL_GET_DOCUMENTS_DESCRIPTION',
      'Gets a list of documents in a project.'
    ),
    schema: z.object(getDocumentsSchema(t)),
    outputSchema: DocumentItemSchema,
    importantFields: ['id', 'projectId', 'title', 'plain'],
    handler: async ({ projectIds, offset }) => {
      return backlog.getDocuments({ projectId: projectIds, offset });
    },
  };
};
