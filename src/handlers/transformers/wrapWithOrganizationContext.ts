import { runWithOrganization } from '../../utils/backlogOrganizationContext.js';

export function wrapWithOrganizationContext<
  I extends { organization?: string },
  O,
>(
  fn: (input: Omit<I, 'organization'>) => Promise<O>
): (input: I) => Promise<O> {
  return async (input: I) => {
    const { organization, ...rest } = input;
    // `return await`, not `return`. A handler that throws before its first
    // `await` hands back an already-rejected promise, and a bare `return`
    // leaves it unhandled until the enclosing async function adopts it one
    // microtask later. Node says nothing; workerd fires `unhandledrejection`
    // and then `rejectionhandled` for the same promise, which fails test
    // runners that treat the first as an error. Awaiting here attaches the
    // handler in the same tick.
    return await runWithOrganization(organization, () =>
      fn(rest as Omit<I, 'organization'>)
    );
  };
}
