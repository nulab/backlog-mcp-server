import { z } from 'zod';
import { wrapWithErrorHandling } from '../transformers/wrapWithErrorHandling.js';
import { wrapWithOrganizationContext } from '../transformers/wrapWithOrganizationContext.js';
import { ErrorLike, isErrorLike } from '../../types/result.js';
import { NativeContentToolDefinition } from '../../types/tool.js';

export type ComposeNativeContentOptions = {
  errorHandler?: (err: unknown) => ErrorLike;
  useOrganization?: boolean;
};

type NativeContentInput = {
  organization?: string;
} & Record<string, unknown>;

/**
 * Builds the schema and handler a dynamic tool is registered with.
 *
 * The counterpart of `composeToolHandler` for tools that produce a
 * `CallToolResult` themselves. Those cannot go through the whole pipeline:
 * field picking, the token limit and `wrapWithToolResult` all assume a JSON
 * value they may reshape, and reshaping is exactly what a tool returning binary
 * content must not allow — a base64 payload cut at the token limit is a corrupt
 * file reported as a success.
 *
 * The two steps that are not about reshaping still apply, and are why this
 * exists rather than registering the handler directly:
 *
 * - `wrapWithOrganizationContext`, without which a dynamic tool ignores
 *   `organization` and always talks to the default space;
 * - `wrapWithErrorHandling`, without which a thrown Backlog error escapes as a
 *   protocol error rather than an `isError` result, and never reaches the
 *   handler that reacts to Backlog rejecting a credential.
 *
 * As in `composeToolHandler`, the returned schema is a fresh object: the tool
 * definition is never mutated, because one toolset group is shared across
 * per-request servers.
 */
export function composeNativeContentToolHandler(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tool: NativeContentToolDefinition<any>,
  { errorHandler, useOrganization = false }: ComposeNativeContentOptions = {}
) {
  // `extend` even with nothing to add, so the returned schema is always a copy.
  // Handing back `tool.schema` itself would make the invariant above hold only
  // when `useOrganization` is set.
  const schema = tool.schema.extend(
    useOrganization
      ? {
          organization: z
            .string()
            .optional()
            .describe(
              'Optional organization name. Use list_organizations to inspect available organizations.'
            ),
        }
      : {}
  );

  const handler = wrapWithErrorHandling(
    wrapWithOrganizationContext(tool.handler),
    errorHandler
  );

  return {
    schema,
    handler: async (input: NativeContentInput) => {
      const result = await handler(input);

      return isErrorLike(result)
        ? {
            isError: true,
            content: [{ type: 'text' as const, text: result.message }],
          }
        : result.data;
    },
  };
}
