// Library entry point: nothing runs on import, and nothing reachable may need a dependency a
// non-Node runtime lacks (`lib.test.ts` enforces it). OAuth routes/middleware are absent: they
// are tied to this package's synchronous `TokenStore` and Hono.

export { allTools } from './tools/tools.js';
export { composeToolHandler } from './handlers/builders/composeToolHandler.js';
export { composeNativeContentToolHandler } from './handlers/builders/composeNativeContentToolHandler.js';
export { createDescriptionHelper } from './createDescriptionHelper.js';
export { backlogErrorHandler } from './backlog/backlogErrorHandler.js';
export { createBacklogClient } from './backlog/createBacklogClient.js';
export { buildToolSchema } from './types/tool.js';
export { isErrorLike } from './types/result.js';
// Exported with `backlogErrorHandler`: without it an OAuth consumer's rejected token reads as
// "check your API key" and nobody is told to re-authenticate (#261).
export { runWithAccessToken } from './auth/backlogAuthContext.js';

export {
  BacklogTokenError,
  buildBacklogAuthorizationUrl,
  exchangeBacklogCode,
  isGrantGone,
  isTokenRejected,
  refreshBacklogToken,
  verifyBacklogToken,
} from './auth/backlogOAuthClient.js';

export type {
  BacklogClient,
  BacklogClientOptions,
} from './backlog/createBacklogClient.js';
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
