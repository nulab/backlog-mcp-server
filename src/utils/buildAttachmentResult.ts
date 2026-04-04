import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { PassThrough } from 'stream';
import { Buffer } from 'node:buffer';
import { ReadableStream } from 'node:stream/web';
import { buildFileContent, tryDecodeFilename } from './buildFileContent.js';
import {
  MaxInlineBytesExceededError,
  streamToBase64,
} from './streamToBase64.js';
import { getMimeType } from './getMimeType.js';
import { optimizeImageForInline } from './optimizeImageForInline.js';

const DEFAULT_MAX_INLINE_BYTES = 1024 * 1024;
const DEFAULT_MAX_VIDEO_INLINE_BYTES = 10 * 1024 * 1024;
const DEFAULT_MAX_IMAGE_WIDTH = 1600;
const DEFAULT_IMAGE_QUALITY = 72;

export type AttachmentResponseMode = 'legacy' | 'metadata' | 'auto' | 'inline';

type AttachmentResultReason =
  | 'metadata_requested'
  | 'non_image_attachment'
  | 'attachment_exceeds_max_inline_bytes';

type AttachmentMetadata = {
  mode: 'metadata';
  requestedMode: Exclude<AttachmentResponseMode, 'legacy'>;
  filename: string;
  mimeType: string;
  url: string;
  inlineStatus: 'skipped' | 'too_large';
  reason: AttachmentResultReason;
  maxInlineBytes?: number;
};

type BuildAttachmentResultParams = {
  body: PassThrough | ReadableStream | unknown;
  filename?: string;
  responseMode?: Exclude<AttachmentResponseMode, 'legacy'>;
  outputFormat?: 'default' | 'raw_base64';
  fallbackToMetadata?: boolean;
  maxInlineBytes?: number;
  maxVideoInlineBytes?: number;
  maxImageWidth?: number;
  imageQuality?: number;
  url: string;
};

function isVideoMimeType(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

function buildMetadataResult(metadata: AttachmentMetadata): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(metadata, null, 2),
      },
    ],
  };
}

function buildTooLargeError(
  filename: string,
  maxInlineBytes: number,
  actualBytes: number
): CallToolResult {
  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: `Attachment '${filename}' is ${actualBytes} bytes and exceeds maxInlineBytes ${maxInlineBytes}.`,
      },
    ],
  };
}

function shouldInlineAttachment(
  responseMode: AttachmentResponseMode,
  mimeType: string
): boolean {
  switch (responseMode) {
    case 'legacy':
    case 'inline':
      return true;
    case 'metadata':
      return false;
    case 'auto':
      return mimeType.startsWith('image/');
  }
}

function buildImageContent(
  filename: string,
  mimeType: string,
  buffer: Buffer,
  url: string
): CallToolResult {
  return buildFileContent(filename, mimeType, buffer.toString('base64'), url);
}

function buildRawBase64Result(
  filename: string,
  mimeType: string,
  base64: string
): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ base64, mimeType, filename }),
      },
    ],
  };
}

export async function buildAttachmentResult({
  body,
  filename: rawFilename,
  responseMode,
  outputFormat = 'default',
  fallbackToMetadata = true,
  maxInlineBytes = DEFAULT_MAX_INLINE_BYTES,
  maxVideoInlineBytes = DEFAULT_MAX_VIDEO_INLINE_BYTES,
  maxImageWidth = DEFAULT_MAX_IMAGE_WIDTH,
  imageQuality = DEFAULT_IMAGE_QUALITY,
  url,
}: BuildAttachmentResultParams): Promise<CallToolResult> {
  const effectiveResponseMode: AttachmentResponseMode =
    responseMode ?? 'legacy';
  const filename = tryDecodeFilename(rawFilename ?? '');
  const mimeType = getMimeType(filename);
  const effectiveInlineLimit = isVideoMimeType(mimeType)
    ? maxVideoInlineBytes
    : maxInlineBytes;

  if (outputFormat === 'raw_base64') {
    const base64 = await streamToBase64(body);
    return buildRawBase64Result(filename, mimeType, base64);
  }

  if (effectiveResponseMode === 'metadata') {
    return buildMetadataResult({
      mode: 'metadata',
      requestedMode: 'metadata',
      filename,
      mimeType,
      url,
      inlineStatus: 'skipped',
      reason: 'metadata_requested',
    });
  }

  if (!shouldInlineAttachment(effectiveResponseMode, mimeType)) {
    return buildMetadataResult({
      mode: 'metadata',
      requestedMode: 'auto',
      filename,
      mimeType,
      url,
      inlineStatus: 'skipped',
      reason: 'non_image_attachment',
      maxInlineBytes: effectiveInlineLimit,
    });
  }

  if (
    effectiveResponseMode !== 'legacy' &&
    mimeType.startsWith('image/') &&
    mimeType !== 'image/svg+xml'
  ) {
    try {
      const optimizedImage = await optimizeImageForInline({
        body,
        filename,
        maxBytes: maxInlineBytes,
        maxImageWidth,
        imageQuality,
      });

      if (optimizedImage) {
        return buildImageContent(
          optimizedImage.filename,
          optimizedImage.mimeType,
          optimizedImage.buffer,
          url
        );
      }

      if (effectiveResponseMode === 'inline' && !fallbackToMetadata) {
        return buildTooLargeError(filename, maxInlineBytes, maxInlineBytes + 1);
      }

      return buildMetadataResult({
        mode: 'metadata',
        requestedMode: effectiveResponseMode,
        filename,
        mimeType,
        url,
        inlineStatus: 'too_large',
        reason: 'attachment_exceeds_max_inline_bytes',
        maxInlineBytes,
      });
    } catch (error) {
      if (!(error instanceof MaxInlineBytesExceededError)) {
        // Some image-like attachments may have an image extension but not contain
        // decodable pixels. Fall back to the regular path so size guards still apply.
      } else {
        if (effectiveResponseMode === 'inline' && !fallbackToMetadata) {
          return buildTooLargeError(
            filename,
            error.maxInlineBytes,
            error.actualBytes
          );
        }

        return buildMetadataResult({
          mode: 'metadata',
          requestedMode: effectiveResponseMode,
          filename,
          mimeType,
          url,
          inlineStatus: 'too_large',
          reason: 'attachment_exceeds_max_inline_bytes',
          maxInlineBytes: error.maxInlineBytes,
        });
      }
    }
  }

  try {
    const base64 = await streamToBase64(
      body,
      effectiveResponseMode === 'legacy'
        ? undefined
        : { maxBytes: effectiveInlineLimit }
    );

    return buildFileContent(filename, mimeType, base64, url);
  } catch (error) {
    if (!(error instanceof MaxInlineBytesExceededError)) {
      throw error;
    }

    if (effectiveResponseMode === 'inline' && !fallbackToMetadata) {
      return buildTooLargeError(
        filename,
        effectiveInlineLimit,
        error.actualBytes
      );
    }

    return buildMetadataResult({
      mode: 'metadata',
      requestedMode:
        effectiveResponseMode === 'legacy' ? 'inline' : effectiveResponseMode,
      filename,
      mimeType,
      url,
      inlineStatus: 'too_large',
      reason: 'attachment_exceeds_max_inline_bytes',
      maxInlineBytes: effectiveInlineLimit,
    });
  }
}
