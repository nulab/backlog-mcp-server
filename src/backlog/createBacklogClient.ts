import { createClient } from 'backlog-js';
import type { Client, ClientConfigure } from 'backlog-js';

// Exported so a consumer can type what it passes to `allTools` without depending on backlog-js.
export type BacklogClient = Client;

export type BacklogClientOptions = ClientConfigure;

// Built here so the client always matches the backlog-js the tools were written against;
// a consumer's own copy can resolve to another version whose `Backlog` type does not match.
export function createBacklogClient(
  options: BacklogClientOptions
): BacklogClient {
  return createClient(options);
}
