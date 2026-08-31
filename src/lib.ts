/**
 * Library entry point.
 *
 * `src/index.ts` is the CLI: it parses argv, reads config files and starts a
 * transport. Consumers that only want the tool layer — to host the same tools on
 * a different runtime, for example — cannot import it without running all of that.
 * This module exposes the pieces needed to build a server, and nothing that runs
 * on import.
 *
 * Nothing reachable from here may touch a Node built-in. `loadDescriptionOverrides`
 * is the counter-example worth remembering: it reads the override file from disk,
 * so it belongs to the CLI and is deliberately absent below. Consumers on other
 * runtimes pass their own overrides to `createDescriptionHelper`.
 */

export { allTools } from './tools/tools.js';
export { composeToolHandler } from './handlers/builders/composeToolHandler.js';
export { createDescriptionHelper } from './createDescriptionHelper.js';
export { backlogErrorHandler } from './backlog/backlogErrorHandler.js';
export { buildToolSchema } from './types/tool.js';
export { isErrorLike } from './types/result.js';

export type { ComposeOptions } from './handlers/builders/composeToolHandler.js';
export type { DescriptionHelper } from './createDescriptionHelper.js';
export type { ToolDefinition, DynamicToolDefinition } from './types/tool.js';
export type {
  Toolset,
  ToolsetGroup,
  DynamicToolset,
  DynamicToolsetGroup,
} from './types/toolsets.js';
export type { ErrorLike, SafeResult } from './types/result.js';

/**
 * The OAuth state contract, so a deployment can back client registrations and
 * tokens with something that outlives a restart and is shared between
 * instances. Types only: the server that consumes one is the CLI, which loads
 * an implementation named by `--token-store-module`.
 */
export type {
  TokenStore,
  TokenStoreFactory,
  OAuthClientInfo,
  PendingAuthorization,
  AuthCodeEntry,
  McpTokenEntry,
  McpRefreshEntry,
  BacklogTokenData,
} from './auth/tokenStore.js';
