import { isInputRequiredResult } from '@modelcontextprotocol/server';
import type { ServerContext } from '@modelcontextprotocol/server';
import { describe, expect, it, vi } from 'vite-plus/test';
import { withConfirmation } from './withConfirmation';

const ctxWith = (inputResponses?: Record<string, unknown>) =>
  ({ mcpReq: { inputResponses } }) as unknown as ServerContext;

const ok = { content: [{ type: 'text' as const, text: 'done' }] };

describe('withConfirmation', () => {
  it('asks for confirmation without running the tool on the first call', async () => {
    const handler = vi.fn(async () => ok);
    const wrapped = withConfirmation('add_issue', handler);

    const result = await wrapped({ summary: 'Bug' }, ctxWith());

    expect(isInputRequiredResult(result)).toBe(true);
    expect(JSON.stringify(result)).toContain('add_issue');
    expect(JSON.stringify(result)).toContain('Bug');
    expect(handler).not.toHaveBeenCalled();
  });

  it('runs the tool once the user accepts with confirm true', async () => {
    const handler = vi.fn(async () => ok);
    const wrapped = withConfirmation('add_issue', handler);
    const ctx = ctxWith({
      confirm: { action: 'accept', content: { confirm: true } },
    });

    const result = await wrapped({ summary: 'Bug' }, ctx);

    expect(result).toBe(ok);
    expect(handler).toHaveBeenCalledWith({ summary: 'Bug' }, ctx);
  });

  it.each([
    ['declines', { action: 'decline' }],
    ['cancels', { action: 'cancel' }],
    [
      'accepts with confirm false',
      { action: 'accept', content: { confirm: false } },
    ],
    ['accepts without content', { action: 'accept' }],
  ])(
    'returns an error without running the tool when the user %s',
    async (_, response) => {
      const handler = vi.fn(async () => ok);
      const wrapped = withConfirmation('delete_issue', handler);

      const result = await wrapped({}, ctxWith({ confirm: response }));

      expect(result).toMatchObject({ isError: true });
      expect(isInputRequiredResult(result)).toBe(false);
      expect(handler).not.toHaveBeenCalled();
    }
  );
});
