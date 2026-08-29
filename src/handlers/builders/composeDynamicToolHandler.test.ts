import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { composeDynamicToolHandler } from './composeDynamicToolHandler.js';
import { getCurrentOrganization } from '../../utils/backlogOrganizationContext.js';
import { DynamicToolDefinition } from '../../types/tool.js';

function toolReturning(
  handler: DynamicToolDefinition<{ id: z.ZodNumber }>['handler']
): DynamicToolDefinition<{ id: z.ZodNumber }> {
  return {
    name: 'dummy',
    description: 'dummy',
    schema: z.object({ id: z.number() }),
    handler,
  };
}

describe('composeDynamicToolHandler', () => {
  it('passes the result through untouched', async () => {
    const result = { content: [{ type: 'image', data: 'AA==' }] };
    const { handler } = composeDynamicToolHandler(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toolReturning(async () => result as any)
    );

    await expect(handler({ id: 1 })).resolves.toBe(result);
  });

  it('runs the handler inside the organization context', async () => {
    const seen = vi.fn();
    const { handler } = composeDynamicToolHandler(
      toolReturning(async () => {
        seen(getCurrentOrganization());
        return { content: [] };
      })
    );

    await handler({ id: 1, organization: 'second-space' });

    expect(seen).toHaveBeenCalledWith('second-space');
  });

  it('advertises `organization` only when asked to', () => {
    const tool = toolReturning(async () => ({ content: [] }));

    expect(Object.keys(composeDynamicToolHandler(tool).schema.shape)).toEqual([
      'id',
    ]);
    expect(
      Object.keys(
        composeDynamicToolHandler(tool, { useOrganization: true }).schema.shape
      )
    ).toEqual(['id', 'organization']);
  });

  it('leaves the tool definition unmutated', () => {
    const tool = toolReturning(async () => ({ content: [] }));

    composeDynamicToolHandler(tool, { useOrganization: true });

    expect(Object.keys(tool.schema.shape)).toEqual(['id']);
  });

  it('turns a thrown error into an isError result via the error handler', async () => {
    const errorHandler = vi.fn(() => ({
      kind: 'error' as const,
      message: 'handled',
    }));
    const { handler } = composeDynamicToolHandler(
      toolReturning(async () => {
        throw new Error('boom');
      }),
      { errorHandler }
    );

    await expect(handler({ id: 1 })).resolves.toEqual({
      isError: true,
      content: [{ type: 'text', text: 'handled' }],
    });
    expect(errorHandler).toHaveBeenCalled();
  });
});
