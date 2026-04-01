import { runWithOrganization } from '../../utils/backlogOrganizationContext.js';

export function wrapWithOrganizationContext<
  I extends { organization?: string },
  O,
>(
  fn: (input: Omit<I, 'organization'>) => Promise<O>
): (input: I) => Promise<O> {
  return async (input: I) => {
    const { organization, ...rest } = input;
    return runWithOrganization(organization, () =>
      fn(rest as Omit<I, 'organization'>)
    );
  };
}
