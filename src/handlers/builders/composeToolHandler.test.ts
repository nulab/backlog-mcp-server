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
    const { schema, handler: composed } = composeToolHandler(tool, {
      useFields: true,
      maxTokens: 500,
    });

    expect(schema.shape).toHaveProperty('fields');

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

    const { schema, handler: composed } = composeToolHandler(
      toolWithoutFields,
      {
        useFields: false,
        maxTokens: 500,
      }
    );

    expect(schema.shape).not.toHaveProperty('fields');

    const result = await composed({ id: 456 }, dummyExtra);
    const content = (result as CallToolResult).content[0];
    expect(content.type).toBe('text');
    if (content.type === 'text') {
      expect(content.text).toContain('id');
      expect(content.text).toContain('name');
    }
  });

  it('extends schema and composes handler with field picking and token limit', async () => {
    const { handler: composed } = composeToolHandler(tool, {
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

  it("adds 'organization' to the returned schema when useOrganization is true", async () => {
    const orgTool: ToolDefinition<any, any> = {
      ...tool,
      schema: z.object({
        name: z.string(),
      }),
    };

    const { schema } = composeToolHandler(orgTool, {
      useFields: true,
      maxTokens: 100,
      useOrganization: true,
    });

    expect(schema.shape).toHaveProperty('organization');
  });

  // One toolset group is shared by every per-request server on the HTTP
  // transport, so composing must not touch the definition: a mutation would be
  // re-applied on every request and seen by requests composing concurrently.
  it('leaves the tool definition untouched', () => {
    const pristine: ToolDefinition<any, any> = {
      ...tool,
      schema: z.object({ name: z.string() }),
    };
    const before = pristine.schema;

    composeToolHandler(pristine, { useFields: true, maxTokens: 100 });
    composeToolHandler(pristine, { useFields: true, maxTokens: 100 });

    expect(pristine.schema).toBe(before);
    expect(Object.keys(pristine.schema.shape)).toEqual(['name']);
  });

  // With a single Backlog space the parameter has exactly one legal value, so
  // repeating it across every tool is ~8 KB of schema the client cannot use.
  it("omits 'organization' when useOrganization is false", async () => {
    const soloTool: ToolDefinition<any, any> = {
      ...tool,
      schema: z.object({ name: z.string() }),
    };

    const { schema } = composeToolHandler(soloTool, {
      useFields: true,
      maxTokens: 100,
      useOrganization: false,
    });

    expect(schema.shape).not.toHaveProperty('organization');
    expect(schema.shape).toHaveProperty('fields');
  });

  // The consequence of the mutation this replaced: once a `useFields: true`
  // compose had baked `fields` into the definition, every later compose kept
  // advertising it — including `useFields: false` ones, which do not apply
  // field picking, so clients saw a parameter that was silently ignored.
  it('honours useFields per call on a reused definition', () => {
    const reused: ToolDefinition<any, any> = {
      ...tool,
      schema: z.object({ name: z.string() }),
    };

    const withFields = composeToolHandler(reused, {
      useFields: true,
      maxTokens: 100,
    });
    expect(withFields.schema.shape).toHaveProperty('fields');

    const withoutFields = composeToolHandler(reused, {
      useFields: false,
      maxTokens: 100,
    });
    expect(withoutFields.schema.shape).not.toHaveProperty('fields');
  });

  // Not advertising the parameter must not turn it into a hazard. The
  // organization wrapper stays in the chain whatever `useOrganization` says, so
  // a handler that still receives the field is served rather than erroring.
  // (Over the wire the schema strips it first, so the single configured space is
  // used — verified against a running server, not reachable from here.)
  it('tolerates an organization reaching the handler when not advertised', async () => {
    const orgTool: ToolDefinition<any, any> = {
      ...tool,
      schema: z.object({ name: z.string() }),
      handler: async () => ({ id: 1, name: 'Sample' }),
    };

    const { handler: composed } = composeToolHandler(orgTool, {
      useFields: false,
      maxTokens: 100,
      useOrganization: false,
    });

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

    const { handler: composed } = composeToolHandler(errorTool, {
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
