import { z } from 'zod';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { CallToolResult } from '@modelcontextprotocol/server';

export type ToolDefinition<Shape extends z.ZodRawShape, Result> = {
  name: string;
  description: string;
  schema: z.ZodObject<Shape>;
  outputFields: readonly (keyof Result)[];
  handler: (
    input: z.infer<z.ZodObject<Shape>> & {
      fields?: string[];
      organization?: string;
    }
  ) => Promise<Result | Result[]>;
  importantFields?: (keyof Result)[];
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
   *
   * Required rather than optional so that a new tool has to answer the question.
   * Left optional, forgetting it would silently mean "no field selection".
   */
  returnsList: boolean;
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
