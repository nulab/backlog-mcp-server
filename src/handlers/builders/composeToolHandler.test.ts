import { describe, expect, it, jest } from '@jest/globals';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { ErrorLike } from '../../types/result.js';
import { ToolDefinition } from '../../types/tool.js';
import { composeToolHandler } from './composeToolHandler.js';

const dummyErrorHandler = (err: unknown): ErrorLike => ({
  kind: 'error',
  message: 'Handled: ' + (err as Error).message,
});

const dummyExtra = {} as RequestHandlerExtra<ServerRequest, ServerNotification>;

describe('composeToolHandler', () => {
  const baseSchema = z.object({
    name: z.string(),
  });

  const outputSchema = z.object({
    id: z.number(),
    name: z.string(),
  });

  const tool: ToolDefinition<any, any> = {
    name: 'get_sample',
    description: 'Returns sample',
    schema: baseSchema,
    outputSchema,
    handler: async () => ({ id: 1, name: 'Sample' }),
    importantFields: ['id', 'name'],
  };

  it("adds 'fields' when useFields is true", async () => {
    const composed = composeToolHandler(tool, {
      useFields: true,
      maxTokens: 500,
    });

    expect(tool.schema.shape).toHaveProperty('fields');

    const result = await composed({ id: 123, fields: '{ id }' }, dummyExtra);
    const content = (result as CallToolResult).content[0];
    expect(content.type).toBe('text');
    if (content.type === 'text') {
      expect(content.text).toContain('id');
      expect(content.text).not.toContain('name');
    }
  });

  it("does not add 'fields' when useFields is false", async () => {
    const toolWithoutFields: ToolDefinition<any, any> = {
      ...tool,
      schema: baseSchema,
      handler: jest.fn(async () => ({
        kind: 'ok',
        data: { id: 456, name: 'hoge' },
      })),
    };

    const composed = composeToolHandler(toolWithoutFields, {
      useFields: false,
      maxTokens: 500,
    });

    expect(toolWithoutFields.schema.shape).not.toHaveProperty('fields');

    const result = await composed({ id: 456 }, dummyExtra);
    const content = (result as CallToolResult).content[0];
    expect(content.type).toBe('text');
    if (content.type === 'text') {
      expect(content.text).toContain('id');
      expect(content.text).toContain('name');
    }
  });

  it('extends schema and composes handler with field picking and token limit', async () => {
    const composed = composeToolHandler(tool, {
      useFields: true,
      errorHandler: dummyErrorHandler,
      maxTokens: 100,
    });

    const input = { name: 'test', fields: '{ id name }' };
    const result = await composed(input, {} as any);
    expect(result).toHaveProperty('content');
    const content = result.content[0];
    expect(content.type).toBe('text');
    if (content.type === 'text') {
      expect(content.text).toContain('"id": 1');
      expect(content.text).toContain('"name": "Sample"');
    }
  });

  it('handles error with provided errorHandler', async () => {
    const errorTool = {
      ...tool,
      handler: async () => {
        throw new Error('fail test');
      },
    };

    const composed = composeToolHandler(errorTool, {
      useFields: true,
      errorHandler: dummyErrorHandler,
      maxTokens: 100,
    });

    const input = { name: 'test', fields: '{ id name }' };
    const result = await composed(input, {} as any);
    expect(result).toHaveProperty('isError', true);
    const content = result.content[0];
    if (content.type === 'text') {
      expect(content.text).toMatch(/Handled: fail test/);
    }
  });
});
