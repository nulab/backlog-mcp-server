import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { z } from 'zod';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { countTokens } from '../utils/tokenCounter.js';

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
 * An upper bound, not a promise: the slice is shortened further when the
 * response would not fit in `MAX_TOKENS` (see `fitToTokenLimit`).
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
        `Maximum number of characters of \`plain\` to return (default: ${DEFAULT_LIMIT}). Fewer may be returned so that the response fits the server's token limit; continue from \`nextStart\`.`
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
    handler: async (
      { documentId, start = 0, limit = DEFAULT_LIMIT },
      context
    ) => {
      // eslint-disable-next-line no-unused-vars
      const { json, plain, ...document } =
        await backlog.getDocument(documentId);
      // Typed as a string, but not trusted to be one: before slicing, a
      // missing `plain` was passed through; now it would throw.
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

      const end = toCodePointBoundary(
        text,
        Math.min(from + limit, text.length)
      );

      return slice(
        context
          ? fitToTokenLimit(text, from, end, slice, context.maxTokens)
          : end
      );
    },
  };
};

/**
 * The largest end, no later than `end`, at which the response fits in
 * `maxTokens`.
 *
 * Without this a slice that is over the limit is cut by `wrapWithTokenLimit`
 * somewhere inside `plain`, while `nextStart` still points past the end of
 * the slice: whatever lay between the cut and `nextStart` would be skipped.
 * How many tokens a character costs depends on the text — about one for
 * Japanese, more for markup that JSON escapes — so the slice is measured with
 * the same counter `wrapWithTokenLimit` uses rather than estimated.
 *
 * At least one character is returned, even over the limit, so that reading
 * on from `nextStart` always makes progress.
 */
function fitToTokenLimit(
  text: string,
  from: number,
  end: number,
  slice: (end: number) => DocumentSlice,
  maxTokens: number
): number {
  const fits = (e: number) =>
    countTokens(JSON.stringify(slice(e))) <= maxTokens;

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

/**
 * `index`, moved back by one if it falls between the two halves of a surrogate
 * pair.
 *
 * `slice` counts UTF-16 code units, so a boundary can land inside an emoji or
 * a rare CJK character. Cutting there leaves each slice with half of the
 * character, which JSON then carries as a lone `\ud83d`-style escape.
 */
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
