import { wrapWithToolResult } from './wrapWithToolResult.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import {
  ServerNotification,
  ServerRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { describe, it, expect } from 'vitest';

describe('wrapWithToolResult', () => {
  const dummyExtra = {} as RequestHandlerExtra<ServerRequest, ServerNotification>;

  it('returns error result when SafeResult is error', async () => {
    const fn = async () =>
      ({ kind: 'error', message: 'Something went wrong' }) as const;
    const wrapped = wrapWithToolResult(fn);

    const result = await wrapped({}, dummyExtra);
    expect(result).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: 'Something went wrong',
        },
      ],
    });
  });

  it('returns plain text when result data is string', async () => {
    const fn = async () => ({ kind: 'ok', data: 'Hello, world' }) as const;
    const wrapped = wrapWithToolResult(fn);

    const result = await wrapped({}, dummyExtra);
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'Hello, world',
        },
      ],
    });
  });

  it('returns JSON text when result data is object', async () => {
    const fn = async () =>
      ({ kind: 'ok', data: { id: 1, name: 'Test' } }) as const;
    const wrapped = wrapWithToolResult(fn);

    const result = await wrapped({}, dummyExtra);
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify({ id: 1, name: 'Test' }, null, 2),
        },
      ],
    });
  });
});
