import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { z } from 'zod';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';

const getDocumentCommentsSchema = buildToolSchema((t) => ({
  documentId: z
    .string()
    .describe(t('TOOL_GET_DOCUMENT_COMMENTS_DOCUMENT_ID', 'Document ID')),
}));

export const getDocumentCommentsTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof getDocumentCommentsSchema>,
  Entity.Document.DocumentComment
> => {
  return {
    name: 'get_document_comments',
    description: t(
      'TOOL_GET_DOCUMENT_COMMENTS_DESCRIPTION',
      'Returns list of comments (with their replies) for a document.'
    ),
    schema: z.object(getDocumentCommentsSchema(t)),
    returnsList: true,
    outputFields: outputFields<Entity.Document.DocumentComment>()([
      'id',
      'documentId',
      'statusId',
      'content',
      'plain',
      'commentType',
      'createdUserId',
      'created',
      'updatedUserId',
      'updated',
      'createdUser',
      'replies',
    ]),
    importantFields: ['id', 'plain', 'createdUser', 'created', 'replies'],
    handler: async ({ documentId }) => {
      return backlog.getDocumentComments(documentId);
    },
  };
};
