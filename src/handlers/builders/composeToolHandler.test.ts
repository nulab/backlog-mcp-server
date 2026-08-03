import { describe, expect, it, vi } from 'vitest';
import { CallToolResult, ServerContext } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { ErrorLike } from '../../types/result.js';
import { ToolDefinition } from '../../types/tool.js';
import { composeToolHandler } from './composeToolHandler.js';

const dummyErrorHandler = (err: unknown): ErrorLike => ({
  kind: 'error',
  message: 'Handled: ' + (err as Error).message,
});

const dummyExtra = {} as ServerContext;

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
      handler: vi.fn(async () => ({
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

  it("adds 'organization' when useOrganization is true", async () => {
    const orgTool: ToolDefinition<any, any> = {
      ...tool,
      schema: z.object({
        name: z.string(),
      }),
    };

    composeToolHandler(orgTool, {
      useFields: true,
      maxTokens: 100,
      useOrganization: true,
    });

    expect(orgTool.schema.shape).toHaveProperty('organization');
  });

  // With a single Backlog space the parameter has exactly one legal value, so
  // repeating it across every tool is ~8 KB of schema the client cannot use.
  it("omits 'organization' when useOrganization is false", async () => {
    const soloTool: ToolDefinition<any, any> = {
      ...tool,
      schema: z.object({ name: z.string() }),
    };

    composeToolHandler(soloTool, {
      useFields: true,
      maxTokens: 100,
      useOrganization: false,
    });

    expect(soloTool.schema.shape).not.toHaveProperty('organization');
    expect(soloTool.schema.shape).toHaveProperty('fields');
  });

  it('still routes an organization passed by a client to the context', async () => {
    const orgTool: ToolDefinition<any, any> = {
      ...tool,
      schema: z.object({ name: z.string() }),
      handler: async () => ({ id: 1, name: 'Sample' }),
    };

    const composed = composeToolHandler(orgTool, {
      useFields: false,
      maxTokens: 100,
      useOrganization: false,
    });

    // The organization wrapper stays in the chain either way, so a client that
    // sends the parameter anyway is served rather than erroring.
    const result = await composed({ organization: 'primary' }, dummyExtra);
    expect((result as CallToolResult).isError).not.toBe(true);
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
