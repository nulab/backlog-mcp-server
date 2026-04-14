import { AsyncLocalStorage } from 'node:async_hooks';

const organizationStorage = new AsyncLocalStorage<string | undefined>();

export function runWithOrganization<T>(
  organization: string | undefined,
  fn: () => Promise<T>
): Promise<T> {
  return organizationStorage.run(organization, fn);
}

export function getCurrentOrganization(): string | undefined {
  return organizationStorage.getStore();
}
