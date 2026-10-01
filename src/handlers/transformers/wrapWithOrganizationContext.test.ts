import { wrapWithOrganizationContext } from './wrapWithOrganizationContext';
import { getCurrentOrganization } from '../../utils/backlogOrganizationContext';
import { vi, describe, it, expect } from 'vite-plus/test';

describe('wrapWithOrganizationContext', () => {
  it('reads the organization inside the wrapped call', async () => {
    const seen: (string | undefined)[] = [];
    const wrapped = wrapWithOrganizationContext(async () => {
      seen.push(getCurrentOrganization());
      return 'ok';
    });

    await wrapped({ organization: 'acme' });

    expect(seen).toEqual(['acme']);
  });

  it('leaves no organization in scope once the call is over', async () => {
    const wrapped = wrapWithOrganizationContext(async () => 'ok');

    await wrapped({ organization: 'acme' });

    expect(getCurrentOrganization()).toBeUndefined();
  });

  it('does not pass organization on to the wrapped function', async () => {
    const fn = vi.fn(async (_input: { id: number }) => 'ok');
    const wrapped = wrapWithOrganizationContext<
      { organization?: string; id: number },
      string
    >(fn);

    await wrapped({ organization: 'acme', id: 1 });

    expect(fn).toHaveBeenCalledWith({ id: 1 });
  });

  it('runs without an organization when none is given', async () => {
    const wrapped = wrapWithOrganizationContext(async () =>
      getCurrentOrganization()
    );

    expect(await wrapped({})).toBeUndefined();
  });

  it('resolves with what the wrapped function returned', async () => {
    const wrapped = wrapWithOrganizationContext(async () => ({ id: 1 }));

    expect(await wrapped({ organization: 'acme' })).toEqual({ id: 1 });
  });

  // The path behind #259: a handler that validates its input rejects before it
  // ever awaits, so the wrapper is handed an already-rejected promise. On Node
  // the only observable part is that the rejection still reaches the caller
  // unchanged — the premature `unhandledrejection` that `return await` fixes
  // shows up on workerd, not here.
  it('propagates a rejection thrown before the first await', async () => {
    const wrapped = wrapWithOrganizationContext(() => {
      throw new Error('missing issueId or issueKey');
    });

    await expect(wrapped({ organization: 'acme' })).rejects.toThrow(
      'missing issueId or issueKey'
    );
  });
});
