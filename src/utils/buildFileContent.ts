import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

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
