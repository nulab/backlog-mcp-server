import { z } from 'zod';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { CallToolResult } from '@modelcontextprotocol/server';

/** Optional so tests can call a handler directly; `composeToolHandler` always passes it. */
export type ToolContext = {
  /** The `MAX_TOKENS` the response will be cut at by `wrapWithTokenLimit`. */
  maxTokens: number;
};

export type ToolDefinition<Shape extends z.ZodRawShape, Result> = {
  name: string;
  description: string;
  schema: z.ZodObject<Shape>;
  outputFields: readonly (keyof Result)[];
  handler: (
    input: z.infer<z.ZodObject<Shape>> & {
      fields?: string[];
      organization?: string;
    },
    context?: ToolContext
  ) => Promise<Result | Result[]>;
  importantFields?: (keyof Result)[];
  /**
   * `--optimize-response` publishes `fields` only on list tools (`backlog-js` returns `Promise<T[]>`).
   * Required so a new tool has to answer; optional would silently mean no field selection.
   */
  returnsList: boolean;
};

export const buildToolSchema = <T extends z.ZodRawShape>(
  fn: (t: DescriptionHelper['t']) => T
) => fn;

// For tools whose result the pipeline cannot express or would corrupt (`image`/`resource`
// content, base64 cut at the token limit). They give up field picking and the token limit.
export type NativeContentToolDefinition<Shape extends z.ZodRawShape> = {
  name: string;
  description: string;
  schema: z.ZodObject<Shape>;
  handler: (input: z.infer<z.ZodObject<Shape>>) => Promise<CallToolResult>;
};
