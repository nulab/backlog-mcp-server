import { createClient } from 'backlog-js';
import type { Client, ClientConfigure } from 'backlog-js';

/**
 * The Backlog API client the tools are built on.
 *
 * Exported as a type alongside `createBacklogClient` so that a consumer can
 * name what it passes to `allTools` without depending on `backlog-js` itself.
 */
export type BacklogClient = Client;

export type BacklogClientOptions = ClientConfigure;

/**
 * Creates the client to pass to `allTools`.
 *
 * A consumer that constructed `Backlog` from its own `backlog-js` had to keep
 * that dependency in step with this package's: as soon as the two ranges
 * resolved to different versions, two copies were installed and their
 * `Backlog` types no longer matched (`Property 'getDocumentComments' is
 * missing`). Building the client here makes it always the version the tools
 * were written against, so the consumer only upgrades this package.
 */
export function createBacklogClient(
  options: BacklogClientOptions
): BacklogClient {
  return createClient(options);
}
