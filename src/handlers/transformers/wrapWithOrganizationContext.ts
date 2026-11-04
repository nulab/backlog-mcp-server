import { runWithOrganization } from '../../utils/backlogOrganizationContext.js';

export function wrapWithOrganizationContext<
  I extends { organization?: string },
  O,
>(
  fn: (input: Omit<I, 'organization'>) => Promise<O>
): (input: I) => Promise<O> {
  return async (input: I) => {
    const { organization, ...rest } = input;
    // `return await`, not `return`: a handler that throws before its first `await` returns a
    // rejected promise; workerd fires `unhandledrejection` before the caller adopts it.
    return await runWithOrganization(organization, () =>
      fn(rest as Omit<I, 'organization'>)
    );
  };
}
