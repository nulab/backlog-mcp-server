import { Backlog } from 'backlog-js';
import { z } from 'zod';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { buildToolSchema, DynamicToolDefinition } from '../types/tool.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';

const MEBIBYTE = 1024 * 1024;

/**
 * Both limits are about what survives the transport, not about what Backlog
 * allows. Base64 inflates by 4/3, and the MCP SDK caps a single stdio message
 * at 10 MiB by default, so 7 MiB of raw bytes is the point beyond which a
 * successful download would still fail to reach the client.
 */
const DEFAULT_MAX_BYTES = 5 * MEBIBYTE;
const MAX_ATTACHMENT_BYTES = 7 * MEBIBYTE;

const MIME_TYPES: Record<string, string> = {
  '.bmp': 'image/bmp',
  '.csv': 'text/csv',
  '.doc': 'application/msword',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.gif': 'image/gif',
  '.gz': 'application/gzip',
  '.html': 'text/html',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx':
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.svg': 'image/svg+xml',
  '.tar': 'application/x-tar',
  '.txt': 'text/plain',
  '.webp': 'image/webp',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xml': 'application/xml',
  '.zip': 'application/zip',
};

/**
 * The raster types this tool returns as MCP `image` content.
 *
 * Deliberately narrower than the raster entries in `MIME_TYPES`, and the limit
 * does not come from MCP — `ImageContent.mimeType` is an unconstrained string
 * in the schema. It comes from the far end: a Claude-backed host forwards the
 * block to the Messages API, which documents support for `image/jpeg`,
 * `image/png`, `image/gif` and `image/webp` and nothing else
 * (https://platform.claude.com/docs/en/build-with-claude/vision). An
 * `image/bmp` block is rejected there, and a rejected block costs the caller
 * the metadata as well as the file rather than merely failing to draw.
 *
 * These four are therefore what is safe to inline. A host backed by something
 * other than Claude may well accept more; nothing here asserts otherwise, it
 * just does not rely on it.
 *
 * `image/svg+xml` is absent for an unrelated reason — an SVG can carry script,
 * and it is text, so it goes down the text path below where it can be read
 * rather than executed.
 *
 * Anything not here is returned as an embedded resource, which every client
 * can hold.
 */
const INLINE_IMAGE_TYPES = new Set([
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

/**
 * Types whose bytes are meant to be read rather than rendered.
 *
 * These are returned as `resource.text`. Handing a caller base64 of a CSV is
 * the same as handing it nothing: the point of fetching a log or a spreadsheet
 * is the content, and base64 has to be decoded by something that can already
 * read the file.
 */
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

/**
 * Reads the whole body, refusing to buffer more than `maxBytes`.
 *
 * The limit is checked per chunk rather than against a `Content-Length`:
 * `backlog-js` does not surface response headers, and a header would be the
 * server's claim rather than what actually arrived.
 */
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

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (!(value instanceof Uint8Array)) {
        throw new Error('Backlog returned a non-binary attachment chunk.');
      }

      size += value.byteLength;
      if (size > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          // Preserve the size-limit error if cancelling the response also fails.
        }
        throw new Error(
          `Attachment exceeds the ${maxBytes}-byte response limit. Raise maxBytes (up to ${MAX_ATTACHMENT_BYTES}) if the file really is this large.`
        );
      }
      chunks.push(value);
    }
  } finally {
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

/**
 * `btoa` over a string built in 32 KiB slices.
 *
 * `String.fromCharCode(...bytes)` on a multi-megabyte array overflows the call
 * stack, and `Buffer` is not available to this module: `src/lib.ts` exposes the
 * tool layer to consumers that do not run on Node.
 */
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

/**
 * Recovers a usable filename from what `backlog-js` reports.
 *
 * `Backlog.parseFileData` takes everything after the first `''` in
 * `Content-Disposition`. When the header carries no RFC 5987 form, `indexOf`
 * returns -1 and the result is the header minus its first character; when it
 * does, the value is left percent-encoded, which is every attachment with a
 * non-ASCII name. Both are repaired here rather than in the client, so the tool
 * works against the published `backlog-js`.
 */
function normalizeFilename(rawName: string | undefined, attachmentId: number) {
  const raw = rawName?.trim() ?? '';
  const contentDispositionMatch =
    /(?:^|;)\s*filename\*?=\s*(?:[\w-]*'[^']*')?"?([^";]+)"?/i.exec(raw);
  // A bare `charset'lang'` prefix with no `filename*=` in front of it is what a
  // client that split the header on the delimiter itself would leave behind.
  const encodedName = (contentDispositionMatch?.[1] ?? raw).replace(
    /^[\w-]*'[^']*'/,
    ''
  );

  let decodedName = encodedName;
  try {
    decodedName = decodeURIComponent(encodedName);
  } catch {
    // Keep malformed percent-encoding as provided by Backlog.
  }

  const basename = decodedName.split(/[/\\]/).pop() ?? decodedName;
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

/**
 * Derived from the filename, because `backlog-js` discards the response
 * headers: `File.FileData` is `{ body, url, filename }` and the real
 * `Content-Type` never reaches this layer.
 */
function getContentType(filename: string): string {
  const extensionIndex = filename.lastIndexOf('.');
  const extension =
    extensionIndex >= 0 ? filename.slice(extensionIndex).toLowerCase() : '';
  return MIME_TYPES[extension] ?? 'application/octet-stream';
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

/**
 * Whether the bytes really are the raster format the extension promises.
 *
 * A client renders `image` content without checking it, so an attachment named
 * `.png` that is not a PNG would otherwise become a broken image with no
 * explanation. Mismatches fall back to an embedded resource.
 */
function isExpectedImage(bytes: Uint8Array, contentType: string): boolean {
  switch (contentType) {
    case 'image/bmp':
      return startsWith(bytes, [0x42, 0x4d]);
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

/**
 * The raster type the bytes actually are, if it is one this tool inlines.
 *
 * A file saved under the wrong extension — a PNG named `.jpg` is the common
 * one — is served happily by Backlog. Trusting the name and giving up would
 * turn it into an opaque blob no client draws, when the bytes needed to
 * identify it are already in hand.
 */
function sniffImageType(bytes: Uint8Array): string | undefined {
  for (const type of INLINE_IMAGE_TYPES) {
    if (isExpectedImage(bytes, type)) {
      return type;
    }
  }
  return undefined;
}

/**
 * `undefined` rather than replacement characters when the bytes are not UTF-8,
 * so a binary file under a `.txt` name falls back to a blob instead of
 * arriving as mojibake that reads like a successful download.
 */
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

/**
 * A synthetic `backlog://` URI, never the URL the download came from.
 *
 * In API-key mode `backlog-js` puts the key in the query string, and
 * `File.FileData.url` carries it verbatim — echoing it into a resource URI
 * would hand the caller a working credential.
 */
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
  backlog: Backlog,
  { t }: DescriptionHelper
): DynamicToolDefinition<ReturnType<typeof getIssueAttachmentSchema>> => {
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

      const fileData = await backlog.getIssueAttachment(
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

      // What the bytes are beats what the name claims. Only when nothing
      // matches and the name promised a raster does the type become opaque:
      // saying `image/png` for something that is not one makes a client draw a
      // broken image with no explanation.
      const declaredType = getContentType(filename);
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
