import { z } from 'zod';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { CallToolResult } from '@modelcontextprotocol/server';

export type ToolDefinition<
  Shape extends z.ZodRawShape,
  OutputShape extends z.ZodRawShape,
> = {
  name: string;
  description: string;
  schema: z.ZodObject<Shape>;
  outputSchema: z.ZodObject<OutputShape>;
  handler: (
    input: z.infer<z.ZodObject<Shape>> & {
      fields?: string;
      organization?: string;
    }
  ) => Promise<
    z.infer<z.ZodObject<OutputShape>> | z.infer<z.ZodObject<OutputShape>>[]
  >;
  importantFields?: (keyof z.infer<z.ZodObject<OutputShape>>)[];
  /**
   * Whether the Backlog call behind this tool returns a list.
   *
   * `--optimize-response` only publishes its `fields` parameter on these. A list
   * is the case where the response grows without bound — `get_issues` alone
   * returns up to 100 issues — and where trimming it is worth the schema every
   * client downloads. A tool that returns one record saves a few hundred bytes at
   * best, against a cost paid on every session by everyone.
   *
   * Verifiable: it is true exactly for the tools whose `backlog-js` method is
   * declared as `Promise<T[]>`.
   */
  returnsList?: boolean;
};

export const buildToolSchema = <T extends z.ZodRawShape>(
  fn: (t: DescriptionHelper['t']) => T
) => fn;

export type DynamicToolDefinition<Shape extends z.ZodRawShape> = {
  name: string;
  description: string;
  schema: z.ZodObject<Shape>;
  handler: (input: z.infer<z.ZodObject<Shape>>) => Promise<CallToolResult>;
};
