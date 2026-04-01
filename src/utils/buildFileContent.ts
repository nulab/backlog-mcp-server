import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * Decodes a URL-encoded filename from a Content-Disposition header.
 * Falls back to the raw value if it contains malformed percent-encoding.
 */
export function tryDecodeFilename(raw: string): string {
  if (!raw) return 'attachment';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function buildFileContent(
  filename: string,
  mimeType: string,
  base64: string,
  url: string
): CallToolResult {
  if (mimeType.startsWith('image/')) {
    return {
      content: [
        {
          type: 'image',
          data: base64,
          mimeType,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: 'resource',
        resource: {
          uri: url,
          mimeType,
          blob: base64,
        },
      },
    ],
  };
}
