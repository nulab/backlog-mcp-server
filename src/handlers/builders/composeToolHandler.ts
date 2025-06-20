/* eslint-disable @typescript-eslint/no-explicit-any */
import { wrapWithErrorHandling } from '../transformers/wrapWithErrorHandling.js';
import { wrapWithFieldPicking } from '../transformers/wrapWithFieldPicking.js';
import { wrapWithTokenLimit } from '../transformers/wrapWithTokenLimit.js';
import { wrapWithToolResult } from '../transformers/wrapWithToolResult.js';
import { z } from 'zod';
import { generateFieldsDescription } from '../../utils/generateFieldsDescription.js';
import { ErrorLike } from '../../types/result.js';
import { ToolDefinition } from '../../types/tool.js';

interface ComposeOptions {
  useFields: boolean;
  errorHandler?: (err: unknown) => ErrorLike;
  maxTokens: number;
}

export function composeToolHandler(
  tool: ToolDefinition<any, any>,
  options: ComposeOptions
) {
  const { useFields, errorHandler, maxTokens } = options;

  // Step 1: Add `fields` to schema if needed
  if (useFields) {
    const fieldDesc = generateFieldsDescription(
      tool.outputSchema,
      (tool.importantFields as string[]) ?? [],
      tool.name
    );
    tool.schema = extendSchema(tool.schema, fieldDesc);
  }

  // Step 2: Compose
  let handler = wrapWithErrorHandling(tool.handler, errorHandler);

  if (useFields) {
    handler = wrapWithFieldPicking(handler);
  }

  return wrapWithToolResult(wrapWithTokenLimit(handler, maxTokens));
}

function extendSchema<I extends z.ZodRawShape>(
  schema: z.ZodObject<I>,
  desc: string
): z.ZodObject<I & { fields: z.ZodString }> {
  return schema.extend({
    fields: z.string().describe(desc),
  }) as z.ZodObject<I & { fields: z.ZodString }>;
}
