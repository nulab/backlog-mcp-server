import { z } from 'zod';
import { wrapWithOrganizationContext } from '../transformers/wrapWithOrganizationContext.js';
import { ErrorLike } from '../../types/result.js';
import { DynamicToolDefinition } from '../../types/tool.js';

export type ComposeDynamicOptions = {
  errorHandler?: (err: unknown) => ErrorLike;
  useOrganization?: boolean;
};

type DynamicInput = {
  organization?: string;
} & Record<string, unknown>;

export function composeDynamicToolHandler(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tool: DynamicToolDefinition<any>,
  { errorHandler, useOrganization = false }: ComposeDynamicOptions = {}
) {
  const schema = useOrganization
    ? tool.schema.extend({
        organization: z
          .string()
          .optional()
          .describe(
            'Optional organization name. Use list_organizations to inspect available organizations.'
          ),
      })
    : tool.schema;
  const handler = wrapWithOrganizationContext(tool.handler);

  return {
    schema,
    handler: async (input: DynamicInput) => {
      try {
        return await handler(input);
      } catch (error) {
        const message = errorHandler
          ? errorHandler(error).message
          : `Unknown: ${error}`;
        return {
          isError: true,
          content: [{ type: 'text' as const, text: message }],
        };
      }
    },
  };
}
