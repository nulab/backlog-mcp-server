import type { Entity } from 'backlog-js';
import { getDocument } from 'backlog-js';
import type { Client } from 'backlog-js';
import { z } from 'zod';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { countTokens } from '../utils/tokenCounter.js';
import { compactResponse } from '../handlers/transformers/wrapWithCompactResponse.js';

// Without `json`: the ProseMirror tree duplicates `plain` at about ten times its size,
// enough to trip the token limit on a document whose text fits.
type DocumentWithoutJson = Omit<Entity.Document.Document, 'json'>;

// `nextStart` is set only when the slice stopped short of the end; its absence means
// the document has been read to the end.
type DocumentSlice = DocumentWithoutJson & {
  plainLength: number;
  nextStart?: number;
};

/** Upper bound; the slice is shortened further to fit `MAX_TOKENS` (see `fitToTokenLimit`). */
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
        `Maximum number of characters of \`plain\` to return (default: ${DEFAULT_LIMIT}). Fewer may be returned so that the response fits the server's token limit; continue from \`nextStart\`.`
      )
    ),
}));

export const getDocumentTool = (
  backlog: Client,
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
    handler: async (
      { documentId, start = 0, limit = DEFAULT_LIMIT },
      context
    ) => {
      // eslint-disable-next-line no-unused-vars
      const { json, plain, ...document } = await getDocument(
        backlog,
        documentId
      );
      // Typed as a string, but not trusted to be one: slicing a missing `plain` would throw.
      const text = plain ?? '';
      const from = toCodePointBoundary(text, Math.min(start, text.length));

      // `plain` goes last. If the response is cut anyway, `wrapWithTokenLimit`
      // keeps its head and drops the tail; with `plain` last, the cut lands in
      // the content and `nextStart` survives it.
      const slice = (end: number): DocumentSlice => ({
        ...document,
        plainLength: text.length,
        ...(end < text.length && { nextStart: end }),
        plain: text.slice(from, end),
      });

      // Moving the end off a surrogate pair can take it back to `from` when
      // `limit` is smaller than the pair; `nextStart` would then repeat `start`
      // and reading on would never advance.
      const boundary = toCodePointBoundary(
        text,
        Math.min(from + limit, text.length)
      );
      const end =
        boundary > from || from === text.length
          ? boundary
          : from + codePointLength(text, from);

      return slice(
        context
          ? fitToTokenLimit(text, from, end, slice, context.maxTokens)
          : end
      );
    },
  };
};

// Without this, `wrapWithTokenLimit` cuts inside `plain` while `nextStart` points past the
// slice, skipping text. Measured with the same counter after the same compaction. At least
// one character is returned so reading on from `nextStart` always makes progress.
function fitToTokenLimit(
  text: string,
  from: number,
  end: number,
  slice: (end: number) => DocumentSlice,
  maxTokens: number
): number {
  const fits = (e: number) =>
    countTokens(JSON.stringify(compactResponse(slice(e)))) <= maxTokens;

  if (fits(end)) {
    return end;
  }

  let lo = from;
  let hi = end;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (fits(mid)) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  const fitted = toCodePointBoundary(text, lo);
  return fitted > from
    ? fitted
    : Math.min(from + codePointLength(text, from), end);
}

// `slice` counts UTF-16 code units; cutting inside a surrogate pair leaves a lone
// `\ud83d`-style escape in the JSON.
function toCodePointBoundary(text: string, index: number): number {
  return index > 0 &&
    index < text.length &&
    isLowSurrogate(text.charCodeAt(index)) &&
    isHighSurrogate(text.charCodeAt(index - 1))
    ? index - 1
    : index;
}

function codePointLength(text: string, index: number): number {
  return (text.codePointAt(index) ?? 0) > 0xffff ? 2 : 1;
}

const isHighSurrogate = (code: number) => code >= 0xd800 && code <= 0xdbff;
const isLowSurrogate = (code: number) => code >= 0xdc00 && code <= 0xdfff;
