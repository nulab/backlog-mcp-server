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
  /**
   * Whether to advertise `organization`. Defaults to false: with a single
   * Backlog space the parameter has exactly one legal value, and repeating it
   * across every tool costs the client ~8 KB of schema for nothing.
   */
  useOrganization?: boolean;
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
  const {
    useFields,
    errorHandler,
    maxTokens,
    useOrganization = false,
  } = options;

  // Step 1: Add `fields` to schema if needed
  const fieldDesc = useFields
    ? generateFieldsDescription(
        tool.outputSchema,
        (tool.importantFields as string[]) ?? [],
        tool.name
      )
    : undefined;
  tool.schema = extendSchema(tool.schema, fieldDesc, useOrganization);

  // Step 2: Compose
  const baseHandler: ComposedHandler = wrapWithErrorHandling(
    wrapWithOrganizationContext(tool.handler),
    errorHandler
  );

  const handler = useFields ? wrapWithFieldPicking(baseHandler) : baseHandler;

  return wrapWithToolResult(wrapWithTokenLimit(handler, maxTokens));
}

function extendSchema<I extends z.ZodRawShape>(
  schema: z.ZodObject<I>,
  desc?: string,
  withOrganization = false
): z.ZodObject<
  I & {
    organization?: z.ZodOptional<z.ZodString>;
    fields?: z.ZodString;
  }
> {
  const extension: Record<string, z.ZodType> = {};

  if (withOrganization) {
    extension.organization = z
      .string()
      .optional()
      .describe(
        'Optional organization name. Use list_organizations to inspect available organizations.'
      );
  }

  if (desc) {
    extension.fields = z.string().describe(desc);
  }

  // zod v4 reworked the ZodObject shape generics, so `extend()`'s result no
  // longer overlaps the declared return type enough for a direct cast. The
  // shape is correct at runtime; route through `unknown` to keep the assertion.
  return schema.extend(extension) as unknown as z.ZodObject<
    I & {
      organization?: z.ZodOptional<z.ZodString>;
      fields?: z.ZodString;
    }
  >;
}
