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

// For tools returning their own `CallToolResult`: reshaping is skipped (a base64 payload cut at
// the token limit is a corrupt file), but organization context and error handling still apply.
// The schema is always a fresh object because one toolset group is shared across servers.
export function composeNativeContentToolHandler(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tool: NativeContentToolDefinition<any>,
  { errorHandler, useOrganization = false }: ComposeNativeContentOptions = {}
) {
  // `extend` even with nothing to add, so the returned schema is always a copy.
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
