/**
 * Rejects flag combinations the transport cannot honour.
 *
 * Returns the message to fail with, or `undefined` when the combination is fine.
 * Kept separate from `index.ts` so it can be tested without starting a CLI.
 */
export function validateTransportOptions({
  transport,
  dynamicToolsets,
}: {
  transport: string;
  dynamicToolsets: boolean;
}): string | undefined {
  if (transport === 'http' && dynamicToolsets) {
    // `enable_toolset` promises the caller that a toolset stays enabled for
    // them. MCP 2026-07-28 removed protocol sessions, so there is no per-client
    // scope left to hold that: the toolset group is shared by every
    // per-request server, and one client's call rewrites what every other
    // client of the process sees, with no way to undo it.
    //
    // On stdio there is one client per process, so the promise holds.
    return [
      '--dynamic-toolsets is not supported with --transport http.',
      'Enabling a toolset would change the tool list for every client of this',
      'process, not just the caller: the protocol has no sessions, so there is',
      'no per-client scope to keep it in.',
      'Use --enable-toolsets to choose the toolsets up front, or run on stdio.',
    ].join(' ');
  }

  return undefined;
}
