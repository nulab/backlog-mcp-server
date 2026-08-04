import { Backlog } from 'backlog-js';
import { z } from 'zod';
import { backlogErrorHandler } from '../backlog/backlogErrorHandler.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { buildToolSchema, DynamicToolDefinition } from '../types/tool.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';

const MEBIBYTE = 1024 * 1024;
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

const INLINE_IMAGE_TYPES = new Set([
  'image/bmp',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
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

async function readBody(
  body: unknown,
  maxBytes: number
): Promise<{ bytes: Uint8Array; sizeBytes: number }> {
  if (!isReadableByteStream(body)) {
    throw new Error('Backlog returned an unsupported attachment body.');
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let sizeBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (!(value instanceof Uint8Array)) {
        throw new Error('Backlog returned a non-binary attachment chunk.');
      }

      sizeBytes += value.byteLength;
      if (sizeBytes > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          // Preserve the size-limit error if cancelling the response also fails.
        }
        throw new Error(
          `Attachment exceeds the ${maxBytes}-byte response limit.`
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(sizeBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { bytes, sizeBytes };
}

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

function normalizeFilename(rawName: string | undefined, attachmentId: number) {
  const raw = rawName?.trim() ?? '';
  const contentDispositionMatch =
    /(?:^|;)\s*filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(raw);
  const encodedName = contentDispositionMatch?.[1] ?? raw;

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

function getMimeType(filename: string): string {
  const extensionIndex = filename.lastIndexOf('.');
  const extension =
    extensionIndex >= 0 ? filename.slice(extensionIndex).toLowerCase() : '';
  return MIME_TYPES[extension] ?? 'application/octet-stream';
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

function isExpectedImage(bytes: Uint8Array, mimeType: string): boolean {
  switch (mimeType) {
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

function getSpaceNamespace(sourceUrl: string): string {
  try {
    return new URL(sourceUrl).host || 'unknown-space';
  } catch {
    return 'unknown-space';
  }
}

function buildResourceUri(
  sourceUrl: string,
  issueIdOrKey: string | number,
  attachmentId: number,
  filename: string
): string {
  const space = encodeURIComponent(getSpaceNamespace(sourceUrl));
  return `backlog://attachments/${space}/issues/${encodeURIComponent(String(issueIdOrKey))}/attachments/${attachmentId}/${encodeURIComponent(filename)}`;
}

function sanitizeErrorMessage(message: string): string {
  return message.replace(/https?:\/\/\S+/gi, '[Backlog URL redacted]');
}

function errorResult(message: string) {
  return {
    isError: true as const,
    content: [{ type: 'text' as const, text: message }],
  };
}

export const getIssueAttachmentTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): DynamicToolDefinition<ReturnType<typeof getIssueAttachmentSchema>> => {
  return {
    name: 'get_issue_attachment',
    description: t(
      'TOOL_GET_ISSUE_ATTACHMENT_DESCRIPTION',
      "Downloads a specific attachment from an issue and returns its binary content as an MCP image or embedded resource. First call get_issue to obtain the attachmentId from the issue's `attachments` array."
    ),
    schema: z.object(getIssueAttachmentSchema(t)),
    handler: async ({ issueId, issueKey, attachmentId, maxBytes }) => {
      const resolved = resolveIdOrKey(
        'issue',
        { id: issueId, key: issueKey },
        t
      );
      if (!resolved.ok) {
        return errorResult(resolved.error.message);
      }

      try {
        const fileData = await backlog.getIssueAttachment(
          resolved.value,
          attachmentId
        );
        const filename = normalizeFilename(
          'filename' in fileData ? fileData.filename : undefined,
          attachmentId
        );
        const { bytes, sizeBytes } = await readBody(
          fileData.body,
          maxBytes ?? DEFAULT_MAX_BYTES
        );
        const inferredMimeType = getMimeType(filename);
        const mimeType =
          INLINE_IMAGE_TYPES.has(inferredMimeType) &&
          !isExpectedImage(bytes, inferredMimeType)
            ? 'application/octet-stream'
            : inferredMimeType;
        const data = toBase64(bytes);
        const metadata = {
          filename,
          mimeType,
          sizeBytes,
          attachmentId,
          issueIdOrKey: resolved.value,
        };

        const binaryContent = INLINE_IMAGE_TYPES.has(mimeType)
          ? {
              type: 'image' as const,
              data,
              mimeType,
            }
          : {
              type: 'resource' as const,
              resource: {
                uri: buildResourceUri(
                  fileData.url,
                  resolved.value,
                  attachmentId,
                  filename
                ),
                blob: data,
                mimeType,
              },
            };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(metadata, null, 2),
            },
            binaryContent,
          ],
        };
      } catch (error) {
        return errorResult(
          sanitizeErrorMessage(backlogErrorHandler(error).message)
        );
      }
    },
  };
};
