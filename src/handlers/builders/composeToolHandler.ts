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

export interface ComposeOptions {
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

/**
 * Builds the schema and handler a tool is registered with.
 *
 * The returned schema is a fresh object: the tool definition is never mutated.
 * That matters under the stateless HTTP model, where one toolset group is shared
 * by every per-request server — an in-place extension would be re-applied on
 * every request, against a definition other requests are reading concurrently.
 */
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
  const schema = extendSchema(tool.schema, fieldDesc, useOrganization);

  // Step 2: Compose
  const baseHandler: ComposedHandler = wrapWithErrorHandling(
    wrapWithOrganizationContext(tool.handler),
    errorHandler
  );

  const composed = useFields ? wrapWithFieldPicking(baseHandler) : baseHandler;

  return {
    schema,
    handler: wrapWithToolResult(wrapWithTokenLimit(composed, maxTokens)),
  };
}

function extendSchema<I extends z.ZodRawShape>(
  schema: z.ZodObject<I>,
  desc?: string,
  withOrganization = false
): z.ZodObject<
  I & {
    organization?: z.ZodOptional<z.ZodString>;
    fields?: z.ZodOptional<z.ZodString>;
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
    // Optional, as both the declared return type here and `wrapWithFieldPicking`
    // have always assumed: it returns the whole result when `fields` is absent.
    // Built without `.optional()`, every call under --optimize-response failed
    // unless the caller supplied a selection.
    extension.fields = z.string().optional().describe(desc);
  }

  // zod v4 reworked the ZodObject shape generics, so `extend()`'s result no
  // longer overlaps the declared return type enough for a direct cast. The
  // shape is correct at runtime; route through `unknown` to keep the assertion.
  return schema.extend(extension) as unknown as z.ZodObject<
    I & {
      organization?: z.ZodOptional<z.ZodString>;
      fields?: z.ZodOptional<z.ZodString>;
    }
  >;
}
