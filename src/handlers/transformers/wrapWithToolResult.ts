import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { isErrorLike, SafeResult } from '../../types/result.js';

/**
 * Convert SafeResult<T> to CallToolResult
 */
export function wrapWithToolResult<I, T>(
  fn: (input: I) => Promise<SafeResult<string | T>>
): (input: I, extra: RequestHandlerExtra) => Promise<CallToolResult> {
  return async (input: I, _extra) => {
    const result = await fn(input);

    if (isErrorLike(result)) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: result.message,
          },
        ],
      };
    }

    const data = result.data;

    if (typeof data === 'string') {
      return {
        content: [
          {
            type: 'text',
            text: data,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  };
}
