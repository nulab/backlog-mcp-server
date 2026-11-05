import { AsyncLocalStorage } from 'node:async_hooks';

export const BACKLOG_DOMAINS = ['backlogtool.com', 'backlog.com', 'backlog.jp'];

// A single DNS label: no dots, so the host built from it always stays under a domain above.
const SPACE_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function isBacklogSpaceHost(host: string): boolean {
  const dot = host.indexOf('.');
  if (dot < 0) return false;
  return (
    SPACE_RE.test(host.slice(0, dot)) &&
    BACKLOG_DOMAINS.includes(host.slice(dot + 1))
  );
}

// The caller's token is sent to this host, so anything outside the Backlog domains
// (or the one the operator configured) is refused to keep it from leaking (SSRF).
export function resolveBacklogHost(
  raw: string | undefined,
  defaultHost?: string
): string | null {
  const host = raw?.trim().toLowerCase();
  const fallback = defaultHost?.trim().toLowerCase() || undefined;
  if (!host) return fallback ?? null;
  return host === fallback || isBacklogSpaceHost(host) ? host : null;
}

const hostStorage = new AsyncLocalStorage<string>();

export function runWithBacklogHost<T>(
  host: string,
  fn: () => Promise<T>
): Promise<T> {
  return hostStorage.run(host, fn);
}

export function getCurrentBacklogHost(): string | undefined {
  return hostStorage.getStore();
}
