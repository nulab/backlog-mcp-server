/**
 * Library entry point.
 *
 * `src/index.ts` is the CLI: it parses argv, reads config files and starts a
 * transport. Consumers that only want the tool layer — to host the same tools on
 * a different runtime, for example — cannot import it without running all of that.
 * This module exposes the pieces needed to build a server, and nothing that runs
 * on import.
 *
 * The rule this entry point holds is narrower than "no Node built-ins": nothing
 * reachable from here may touch a dependency that a non-Node runtime lacks.
 * `loadDescriptionOverrides` is the counter-example worth remembering: it reads
 * the override file from disk, so it belongs to the CLI and is deliberately
 * absent below. Consumers on other runtimes pass their own overrides to
 * `createDescriptionHelper`.
 *
 * `node:async_hooks` is the case that fixes the wording. Two `AsyncLocalStorage`
 * modules — the OAuth request's access token, and the organization a
 * multi-organization call is for — are reachable from `backlogErrorHandler` and
 * from the two handler builders respectively, and ESM evaluates them on import
 * whether or not the consumer uses the symbol. They stay: Cloudflare Workers
 * (`nodejs_compat`), Deno and Bun all provide `async_hooks`, and every consumer
 * on record runs on one of those or on Node. `lib.test.ts` walks the import
 * graph and holds exactly this line — a built-in outside the allowed set fails
 * there rather than in a consumer's build.
 *
 * The OAuth exports are the token calls and the two predicates that say what a
 * failure means. The routes and the middleware are absent: they are built
 * against this package's synchronous `TokenStore` and Hono, so a consumer on
 * its own storage cannot reuse them. The judgement travels, the plumbing does
 * not.
 */

export { allTools } from './tools/tools.js';
export { composeToolHandler } from './handlers/builders/composeToolHandler.js';
export { composeNativeContentToolHandler } from './handlers/builders/composeNativeContentToolHandler.js';
export { createDescriptionHelper } from './createDescriptionHelper.js';
export { backlogErrorHandler } from './backlog/backlogErrorHandler.js';
export { buildToolSchema } from './types/tool.js';
export { isErrorLike } from './types/result.js';
export {
  BacklogTokenError,
  buildBacklogAuthorizationUrl,
  exchangeBacklogCode,
  isGrantGone,
  isTokenRejected,
  refreshBacklogToken,
  verifyBacklogToken,
} from './auth/backlogOAuthClient.js';

export type { ComposeOptions } from './handlers/builders/composeToolHandler.js';
export type { ComposeNativeContentOptions } from './handlers/builders/composeNativeContentToolHandler.js';
export type { DescriptionHelper } from './createDescriptionHelper.js';
export type {
  ToolDefinition,
  NativeContentToolDefinition,
} from './types/tool.js';
export type { Toolset, ToolsetGroup } from './types/toolsets.js';
export type { ErrorLike, SafeResult } from './types/result.js';
export type { BacklogOAuthConfig } from './auth/backlogOAuthConfig.js';
export type { BacklogTokenData } from './auth/tokenStore.js';
