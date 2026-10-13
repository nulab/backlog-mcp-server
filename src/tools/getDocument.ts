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

/**
 * The document with `plain` cut to the slice that was asked for.
 *
 * `plainLength` is the length of the whole of `plain`, so the caller can tell
 * how much there is. `nextStart` is where the next slice begins and is set only
 * when the slice stopped short of the end: its absence is what says the
 * document has been read to the end.
 */
type DocumentSlice = DocumentWithoutJson & {
  plainLength: number;
  nextStart?: number;
};

/**
 * Characters of `plain` returned when `limit` is not given.
 *
 * Well under the point where `MAX_TOKENS` (50,000 by default) would cut the
 * response: the token counter counts each non-ASCII character as a token, so a
 * Japanese document costs about a token per character.
 */
const DEFAULT_LIMIT = 40_000;

const getDocumentSchema = buildToolSchema((t) => ({
  documentId: z
    .string()
    .describe(t('TOOL_GET_DOCUMENT_DOCUMENT_ID', 'Document ID')),
  start: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe(
      t(
        'TOOL_GET_DOCUMENT_START',
        'Character offset in `plain` to start reading from (default: 0). To read a long document in parts, pass the `nextStart` of the previous response.'
      )
    ),
  limit: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      t(
        'TOOL_GET_DOCUMENT_LIMIT',
        `Maximum number of characters of \`plain\` to return (default: ${DEFAULT_LIMIT}).`
      )
    ),
}));

export const getDocumentTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<ReturnType<typeof getDocumentSchema>, DocumentSlice> => {
  return {
    name: 'get_document',
    description: t(
      'TOOL_GET_DOCUMENT_DESCRIPTION',
      'Gets information about a document. The content is returned as plain text in `plain`, up to `limit` characters at a time; when `nextStart` is present, the rest can be read by calling again with `start` set to it.'
    ),
    schema: z.object(getDocumentSchema(t)),
    returnsList: false,
    outputFields: outputFields<DocumentSlice>()([
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
      'plainLength',
      'nextStart',
    ]),
    importantFields: ['id', 'title', 'createdUser'],
    handler: async ({ documentId, start = 0, limit = DEFAULT_LIMIT }) => {
      // eslint-disable-next-line no-unused-vars
      const { json, plain, ...document } =
        await backlog.getDocument(documentId);
      // Typed as a string, but not trusted to be one: before slicing, a
      // missing `plain` was passed through; now it would throw.
      const text = plain ?? '';
      const end = start + limit;

      // `plain` goes last. When the response is still over the token limit,
      // `wrapWithTokenLimit` keeps its head and drops the tail; with `plain`
      // last, the cut lands in the content and `nextStart` survives it, so the
      // caller still learns there is more to read.
      return {
        ...document,
        plainLength: text.length,
        ...(end < text.length && { nextStart: end }),
        plain: text.slice(start, end),
      };
    },
  };
};
