/* eslint-disable @typescript-eslint/no-explicit-any */
import { wrapWithErrorHandling } from '../transformers/wrapWithErrorHandling.js';
import { wrapWithFieldPicking } from '../transformers/wrapWithFieldPicking.js';
import { wrapWithOrganizationContext } from '../transformers/wrapWithOrganizationContext.js';
import { wrapWithTokenLimit } from '../transformers/wrapWithTokenLimit.js';
import { wrapWithToolResult } from '../transformers/wrapWithToolResult.js';
import { z } from 'zod';
import { generateFieldsDescription } from '../../utils/generateFieldsDescription.js';
import { ErrorLike, SafeResult } from '../../types/result.js';
import { ToolDefinition } from '../../types/tool.js';

interface ComposeOptions {
  useFields: boolean;
  errorHandler?: (err: unknown) => ErrorLike;
  maxTokens: number;
}

type ComposedInput = {
  fields?: string;
  organization?: string;
} & Record<string, unknown>;

type ComposedHandler = (input: ComposedInput) => Promise<SafeResult<unknown>>;

export function composeToolHandler(
  tool: ToolDefinition<any, any>,
  options: ComposeOptions
) {
  const { useFields, errorHandler, maxTokens } = options;

  // Step 1: Add `fields` to schema if needed
  const fieldDesc = useFields
    ? generateFieldsDescription(
        tool.outputSchema,
        (tool.importantFields as string[]) ?? [],
        tool.name
      )
    : undefined;
  tool.schema = extendSchema(tool.schema, fieldDesc);

  // Step 2: Compose
  let handler: ComposedHandler = wrapWithErrorHandling(
    wrapWithOrganizationContext(tool.handler),
    errorHandler
  );

  if (useFields) {
    handler = wrapWithFieldPicking(handler);
  }

  return wrapWithToolResult(wrapWithTokenLimit(handler, maxTokens));
}

function extendSchema<I extends z.ZodRawShape>(
  schema: z.ZodObject<I>,
  desc?: string
): z.ZodObject<
  I & {
    organization: z.ZodOptional<z.ZodString>;
    fields?: z.ZodString;
  }
> {
  const extension: Record<string, z.ZodTypeAny> = {
    organization: z
      .string()
      .optional()
      .describe(
        'Optional organization name. Use list_organizations to inspect available organizations.'
      ),
  };

  if (desc) {
    extension.fields = z.string().describe(desc);
  }

  return schema.extend(extension) as z.ZodObject<
    I & {
      organization: z.ZodOptional<z.ZodString>;
      fields?: z.ZodString;
    }
  >;
}
