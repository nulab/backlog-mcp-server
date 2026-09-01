import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { composeNativeContentToolHandler } from './composeNativeContentToolHandler.js';
import { getCurrentOrganization } from '../../utils/backlogOrganizationContext.js';
import { NativeContentToolDefinition } from '../../types/tool.js';

function toolReturning(
  handler: NativeContentToolDefinition<{ id: z.ZodNumber }>['handler']
): NativeContentToolDefinition<{ id: z.ZodNumber }> {
  return {
    name: 'dummy',
    description: 'dummy',
    schema: z.object({ id: z.number() }),
    handler,
  };
}

describe('composeNativeContentToolHandler', () => {
  it('passes the result through untouched', async () => {
    const result = { content: [{ type: 'image', data: 'AA==' }] };
    const { handler } = composeNativeContentToolHandler(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toolReturning(async () => result as any)
    );

    await expect(handler({ id: 1 })).resolves.toBe(result);
  });

  it('runs the handler inside the organization context', async () => {
    const seen = vi.fn();
    const { handler } = composeNativeContentToolHandler(
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

    expect(
      Object.keys(composeNativeContentToolHandler(tool).schema.shape)
    ).toEqual(['id']);
    expect(
      Object.keys(
        composeNativeContentToolHandler(tool, { useOrganization: true }).schema
          .shape
      )
    ).toEqual(['id', 'organization']);
  });

  it('leaves the tool definition unmutated', () => {
    const tool = toolReturning(async () => ({ content: [] }));

    composeNativeContentToolHandler(tool, { useOrganization: true });

    expect(Object.keys(tool.schema.shape)).toEqual(['id']);
  });

  it('turns a thrown error into an isError result via the error handler', async () => {
    const errorHandler = vi.fn(() => ({
      kind: 'error' as const,
      message: 'handled',
    }));
    const { handler } = composeNativeContentToolHandler(
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

  it("never hands back the tool definition's own schema", () => {
    const tool = toolReturning(async () => ({ content: [] }));

    // One toolset group is shared across per-request servers, so a caller that
    // extended what it got back would be extending every request's copy.
    expect(composeNativeContentToolHandler(tool).schema).not.toBe(tool.schema);
    expect(
      composeNativeContentToolHandler(tool, { useOrganization: true }).schema
    ).not.toBe(tool.schema);
  });
});
