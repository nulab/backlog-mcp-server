/* eslint-disable @typescript-eslint/no-explicit-any */
import { wrapWithCompactResponse } from '../transformers/wrapWithCompactResponse.js';
import { wrapWithErrorHandling } from '../transformers/wrapWithErrorHandling.js';
import { wrapWithFieldPicking } from '../transformers/wrapWithFieldPicking.js';
import { wrapWithOrganizationContext } from '../transformers/wrapWithOrganizationContext.js';
import { wrapWithTokenLimit } from '../transformers/wrapWithTokenLimit.js';
import { wrapWithToolResult } from '../transformers/wrapWithToolResult.js';
import { z } from 'zod';
import { fieldSelectionSchema } from '../../utils/fieldSelection.js';
import { ErrorLike, SafeResult } from '../../types/result.js';
import { ToolDefinition } from '../../types/tool.js';

export interface ComposeOptions {
  useFields: boolean;
  errorHandler?: (err: unknown) => ErrorLike;
  maxTokens: number;
  // Defaults to false: with a single Backlog space `organization` has one legal value,
  // and repeating it across every tool costs the client ~8 KB of schema.
  useOrganization?: boolean;
}

type ComposedInput = {
  fields?: string[];
  organization?: string;
} & Record<string, unknown>;

type ComposedHandler = (input: ComposedInput) => Promise<SafeResult<unknown>>;

// Never mutates the tool definition: under stateless HTTP one toolset is shared by every
// per-request server, so an in-place extension would be re-applied concurrently.
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

  // `fields` only on list tools: that is where a response grows without bound and
  // trimming it pays for the schema every client downloads.
  const fields =
    useFields && tool.returnsList
      ? fieldSelectionSchema(tool.outputFields, tool.importantFields ?? [])
      : undefined;
  const schema = extendSchema(tool.schema, fields, useOrganization);

  const baseHandler: ComposedHandler = wrapWithErrorHandling(
    wrapWithOrganizationContext((input) => tool.handler(input, { maxTokens })),
    errorHandler
  );

  const picked =
    useFields && fields ? wrapWithFieldPicking(baseHandler) : baseHandler;

  // Compacted before the token limit is measured, so that a response is cut
  // only when it is still too long after the padding has gone.
  const composed = wrapWithCompactResponse(picked);

  return {
    schema,
    handler: wrapWithToolResult(wrapWithTokenLimit(composed, maxTokens)),
  };
}

function extendSchema<I extends z.ZodRawShape>(
  schema: z.ZodObject<I>,
  fields?: z.ZodType,
  withOrganization = false
): z.ZodObject<I & { organization?: z.ZodType; fields?: z.ZodType }> {
  const extension: Record<string, z.ZodType> = {};

  if (withOrganization) {
    extension.organization = z
      .string()
      .optional()
      .describe(
        'Optional organization name. Use list_organizations to inspect available organizations.'
      );
  }

  // Optional, as `wrapWithFieldPicking` assumes: it returns the whole result
  // when `fields` is absent.
  if (fields) {
    extension.fields = fields;
  }

  // zod v4's ZodObject generics reject a direct cast of `extend()`'s result; the shape
  // is correct at runtime, so route through `unknown`.
  return schema.extend(extension) as unknown as z.ZodObject<
    I & { organization?: z.ZodType; fields?: z.ZodType }
  >;
}
