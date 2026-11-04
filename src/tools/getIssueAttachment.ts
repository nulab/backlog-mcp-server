import { getIssueAttachment } from 'backlog-js';
import type { Client } from 'backlog-js';
import { z } from 'zod';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { buildToolSchema, NativeContentToolDefinition } from '../types/tool.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';

const MEBIBYTE = 1024 * 1024;

// Limits for what survives the transport: base64 inflates by 4/3, and the MCP SDK caps a
// stdio message at 10 MiB by default.
const DEFAULT_MAX_BYTES = 5 * MEBIBYTE;
const MAX_ATTACHMENT_BYTES = 7 * MEBIBYTE;

// The Messages API accepts only these four and rejects the whole block otherwise
// (https://platform.claude.com/docs/en/build-with-claude/vision). SVG is excluded: it can
// carry script, so it goes down the text path.
const INLINE_IMAGE_TYPES = new Set([
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

// Returned as `resource.text`: base64 of a CSV or a log is useless to the caller.
const TEXT_TYPES = new Set([
  'application/json',
  'application/xml',
  'image/svg+xml',
  'text/csv',
  'text/html',
  'text/plain',
]);

const getIssueAttachmentSchema = buildToolSchema((t) => ({
  issueId: z
    .number()
    .int()
    .optional()
    .describe(
      t(
        'TOOL_GET_ISSUE_ATTACHMENT_ISSUE_ID',
        'The numeric ID of the issue (e.g., 12345)'
      )
    ),
  issueKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_GET_ISSUE_ATTACHMENT_ISSUE_KEY',
        "The key of the issue (e.g., 'PROJ-123')"
      )
    ),
  attachmentId: z
    .number()
    .int()
    .positive()
    .describe(
      t(
        'TOOL_GET_ISSUE_ATTACHMENT_ATTACHMENT_ID',
        "The numeric ID of the attachment. Get it from get_issue (the issue's `attachments` array)."
      )
    ),
  format: z
    .enum(['auto', 'base64'])
    .optional()
    .describe(
      t(
        'TOOL_GET_ISSUE_ATTACHMENT_FORMAT',
        "How to return the file. 'auto' (default) returns a verified raster image as MCP image content and anything else as an embedded resource, so a client can render it. 'base64' returns a single JSON object with the encoded bytes in `content`, for callers that process the file programmatically — note that this puts the whole encoding in the caller's context."
      )
    ),
  maxBytes: z
    .number()
    .int()
    .positive()
    .max(MAX_ATTACHMENT_BYTES)
    .optional()
    .describe(
      t(
        'TOOL_GET_ISSUE_ATTACHMENT_MAX_BYTES',
        `Maximum raw attachment size in bytes. Defaults to ${DEFAULT_MAX_BYTES} and cannot exceed ${MAX_ATTACHMENT_BYTES}.`
      )
    ),
}));

type ReadableByteStream = {
  getReader(): {
    read(): Promise<{ done: boolean; value?: Uint8Array }>;
    cancel(reason?: unknown): Promise<void>;
    releaseLock(): void;
  };
};

function isReadableByteStream(body: unknown): body is ReadableByteStream {
  return (
    typeof body === 'object' &&
    body !== null &&
    'getReader' in body &&
    typeof body.getReader === 'function'
  );
}

// Checked per chunk: `backlog-js` does not surface headers, and `Content-Length` is
// only the server's claim.
async function readBody(
  body: unknown,
  maxBytes: number
): Promise<{ bytes: Uint8Array; size: number }> {
  if (!isReadableByteStream(body)) {
    throw new Error('Backlog returned an unsupported attachment body.');
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let finished = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        finished = true;
        break;
      }
      if (!(value instanceof Uint8Array)) {
        throw new Error('Backlog returned a non-binary attachment chunk.');
      }

      size += value.byteLength;
      if (size > maxBytes) {
        throw new Error(
          `Attachment exceeds the ${maxBytes}-byte response limit. Raise maxBytes (up to ${MAX_ATTACHMENT_BYTES}) if the file really is this large.`
        );
      }
      chunks.push(value);
    }
  } finally {
    // `releaseLock` does not abort the response in flight. Cancelling here covers every
    // way out, including a `read()` that rejects.
    if (!finished) {
      try {
        await reader.cancel();
      } catch {
        // Best effort: keep whatever error got us here.
      }
    }
    reader.releaseLock();
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { bytes, size };
}

// Sliced: spreading a multi-megabyte array overflows the stack, and `Buffer` is unavailable
// to the non-Node consumers of `src/lib.ts`.
function toBase64(bytes: Uint8Array): string {
  const chunks: string[] = [];
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    chunks.push(
      String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
    );
  }

  return globalThis.btoa(chunks.join(''));
}

// The name is the server's string: strip directory parts and control characters.
function normalizeFilename(rawName: string | undefined, attachmentId: number) {
  const basename = (rawName ?? '').split(/[/\\]/).pop() ?? '';
  const cleaned = Array.from(basename)
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint > 0x1f && codePoint !== 0x7f;
    })
    .join('')
    .trim();

  return !cleaned || cleaned === '.' || cleaned === '..'
    ? `attachment-${attachmentId}`
    : cleaned;
}

// `contentType` is the raw header and may carry parameters and any casing;
// `text/csv;charset=UTF-8` would miss the exact lookups below.
function bareMimeType(rawContentType: string): string {
  return rawContentType.split(';')[0].trim().toLowerCase();
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

// A client renders `image` content unchecked, so a mislabelled file would be a broken image.
function isExpectedImage(bytes: Uint8Array, contentType: string): boolean {
  switch (contentType) {
    case 'image/gif':
      return (
        startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
        startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
      );
    case 'image/jpeg':
      return startsWith(bytes, [0xff, 0xd8, 0xff]);
    case 'image/png':
      return startsWith(
        bytes,
        [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
      );
    case 'image/webp':
      return (
        startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50
      );
    default:
      return false;
  }
}

// Backlog serves a PNG named `.jpg` happily; identify it from the bytes instead of giving up.
function sniffImageType(bytes: Uint8Array): string | undefined {
  for (const type of INLINE_IMAGE_TYPES) {
    if (isExpectedImage(bytes, type)) {
      return type;
    }
  }
  return undefined;
}

// `undefined` rather than replacement characters, so a binary `.txt` falls back to a blob.
function decodeUtf8(bytes: Uint8Array): string | undefined {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return undefined;
  }
}

function getSpaceNamespace(sourceUrl: string): string {
  try {
    return new URL(sourceUrl).host || 'unknown-space';
  } catch {
    return 'unknown-space';
  }
}

// Never the download URL: in API-key mode `backlog-js` puts the key in its query string.
function buildResourceUri(
  sourceUrl: string,
  issueIdOrKey: string | number,
  attachmentId: number,
  filename: string
): string {
  const space = encodeURIComponent(getSpaceNamespace(sourceUrl));
  return `backlog://attachments/${space}/issues/${encodeURIComponent(String(issueIdOrKey))}/attachments/${attachmentId}/${encodeURIComponent(filename)}`;
}

function errorResult(message: string) {
  return {
    isError: true as const,
    content: [{ type: 'text' as const, text: message }],
  };
}

export const getIssueAttachmentTool = (
  backlog: Client,
  { t }: DescriptionHelper
): NativeContentToolDefinition<ReturnType<typeof getIssueAttachmentSchema>> => {
  return {
    name: 'get_issue_attachment',
    description: t(
      'TOOL_GET_ISSUE_ATTACHMENT_DESCRIPTION',
      "Downloads one attachment of an issue. Returns it as MCP image or embedded resource content by default, or as base64 in a JSON object with `format: 'base64'`. Call get_issue first to obtain the attachmentId from the issue's `attachments` array."
    ),
    schema: z.object(getIssueAttachmentSchema(t)),
    handler: async ({ issueId, issueKey, attachmentId, format, maxBytes }) => {
      const resolved = resolveIdOrKey(
        'issue',
        { id: issueId, key: issueKey },
        t
      );
      if (!resolved.ok) {
        return errorResult(resolved.error.message);
      }

      const fileData = await getIssueAttachment(
        backlog,
        resolved.value,
        attachmentId
      );
      const filename = normalizeFilename(
        'filename' in fileData ? fileData.filename : undefined,
        attachmentId
      );
      const { bytes, size } = await readBody(
        fileData.body,
        maxBytes ?? DEFAULT_MAX_BYTES
      );

      // The bytes beat the server's type, which Backlog also derives from the extension. Only a
      // promised raster that matches nothing becomes opaque, to avoid drawing a broken image.
      const declaredType =
        bareMimeType(fileData.contentType) || 'application/octet-stream';
      const contentType =
        sniffImageType(bytes) ??
        (INLINE_IMAGE_TYPES.has(declaredType)
          ? 'application/octet-stream'
          : declaredType);

      if (format === 'base64') {
        const data = toBase64(bytes);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { filename, contentType, size, content: data },
                null,
                2
              ),
            },
          ],
        };
      }

      const metadata = {
        filename,
        contentType,
        size,
        attachmentId,
        issueIdOrKey: resolved.value,
      };

      if (INLINE_IMAGE_TYPES.has(contentType)) {
        return {
          content: [
            { type: 'text', text: JSON.stringify(metadata, null, 2) },
            { type: 'image', data: toBase64(bytes), mimeType: contentType },
          ],
        };
      }

      const uri = buildResourceUri(
        fileData.url,
        resolved.value,
        attachmentId,
        filename
      );
      const text = TEXT_TYPES.has(contentType) ? decodeUtf8(bytes) : undefined;
      const binaryContent = {
        type: 'resource' as const,
        resource:
          text === undefined
            ? { uri, blob: toBase64(bytes), mimeType: contentType }
            : { uri, text, mimeType: contentType },
      };

      return {
        content: [
          { type: 'text', text: JSON.stringify(metadata, null, 2) },
          binaryContent,
        ],
      };
    },
  };
};
