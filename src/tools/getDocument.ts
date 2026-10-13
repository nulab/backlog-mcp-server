import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { z } from 'zod';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';

/**
 * A document as `get_document` returns it: without `json`.
 *
 * `json` is the ProseMirror tree of the same content `plain` already carries as
 * text, and it is the bulk of the response — every table cell, paragraph and
 * run of text is wrapped in its own `{"type": ...}` node. A document with a
 * few hundred table cells comes to about ten times its `plain`, enough to trip
 * the token limit on a document whose text alone is well within it.
 */
type DocumentWithoutJson = Omit<Entity.Document.Document, 'json'>;

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
  DocumentWithoutJson
> => {
  return {
    name: 'get_document',
    description: t(
      'TOOL_GET_DOCUMENT_DESCRIPTION',
      'Gets information about a document. The content is returned as plain text in `plain`.'
    ),
    schema: z.object(getDocumentSchema(t)),
    returnsList: false,
    outputFields: outputFields<DocumentWithoutJson>()([
      'id',
      'projectId',
      'title',
      'plain',
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
      // eslint-disable-next-line no-unused-vars
      const { json, ...document } = await backlog.getDocument(documentId);
      return document;
    },
  };
};
