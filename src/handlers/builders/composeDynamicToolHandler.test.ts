import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { DynamicToolDefinition } from '../../types/tool.js';
import { getCurrentOrganization } from '../../utils/backlogOrganizationContext.js';
import { composeDynamicToolHandler } from './composeDynamicToolHandler.js';

function makeTool(
  handler: DynamicToolDefinition<{ value: z.ZodString }>['handler']
): DynamicToolDefinition<{ value: z.ZodString }> {
  return {
    name: 'dynamic_test',
    description: 'Test dynamic handler composition',
    schema: z.object({ value: z.string() }),
    handler,
  };
}

describe('composeDynamicToolHandler', () => {
  it('adds organization to a fresh schema and routes the handler context', async () => {
    const tool = makeTool(async ({ value }) => ({
      content: [
        {
          type: 'text',
          text: `${getCurrentOrganization()}:${value}`,
        },
      ],
    }));
    const composed = composeDynamicToolHandler(tool, {
      useOrganization: true,
    });

    expect('organization' in tool.schema.shape).toBe(false);
    expect('organization' in composed.schema.shape).toBe(true);
    await expect(
      composed.handler({ organization: 'TEAM_A', value: 'ok' })
    ).resolves.toEqual({
      content: [{ type: 'text', text: 'TEAM_A:ok' }],
    });
  });

  it('does not advertise organization in single-organization mode', () => {
    const tool = makeTool(vi.fn());
    const composed = composeDynamicToolHandler(tool);

    expect('organization' in composed.schema.shape).toBe(false);
  });

  it('converts thrown errors into MCP error results', async () => {
    const tool = makeTool(async () => {
      throw new Error('boom');
    });
    const composed = composeDynamicToolHandler(tool, {
      errorHandler: () => ({ kind: 'error', message: 'formatted error' }),
    });

    await expect(composed.handler({ value: 'ok' })).resolves.toEqual({
      isError: true,
      content: [{ type: 'text', text: 'formatted error' }],
    });
  });
});
