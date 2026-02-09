import { Backlog } from 'backlog-js';
import { z } from 'zod';
import { TranslationHelper } from '../createTranslationHelper.js';
import { DocumentItemSchema } from '../types/zod/backlogOutputDefinition.js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';

const addDocumentSchema = buildToolSchema((t) => ({
  projectId: z.number().describe(t('TOOL_ADD_DOCUMENT_PROJECT_ID', 'Project ID')),
  title: z.string().optional().describe(t('TOOL_ADD_DOCUMENT_TITLE', 'Title of the document')),
  content: z.string().optional().describe(t('TOOL_ADD_DOCUMENT_CONTENT', 'Content of the document')),
  emoji: z.string().optional().describe(t('TOOL_ADD_DOCUMENT_EMOJI', 'Emoji for the document')),
  parentId: z.string().optional().describe(t('TOOL_ADD_DOCUMENT_PARENT_ID', 'Parent document ID')),
  addLast: z.boolean().optional().describe(t('TOOL_ADD_DOCUMENT_ADD_LAST', 'Add to the end of the list')),
}));

export const addDocumentTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof addDocumentSchema>,
  (typeof DocumentItemSchema)['shape']
> => {
  return {
    name: 'addDocument',
    description: t(
      'TOOL_ADD_DOCUMENT_DESCRIPTION',
      'Adds a new document to the specified project.'
    ),
    schema: z.object(addDocumentSchema(t)),
    outputSchema: DocumentItemSchema,
    importantFields: ['id', 'projectId', 'title', 'plain', 'createdUser'],
    handler: async (params) => {
      return backlog.addDocument(params);
    },
  };
};
