import { z } from 'zod';
import { TranslationHelper } from '../createTranslationHelper.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export type ToolDefinition<
  Shape extends z.ZodRawShape,
  OutputShape extends z.ZodRawShape,
> = {
  name: string;
  description: string;
  schema: z.ZodObject<Shape>;
  outputSchema: z.ZodObject<OutputShape>;
  handler: (
    input: z.infer<z.ZodObject<Shape>> & { fields?: string }
  ) => Promise<
    z.infer<z.ZodObject<OutputShape>> | z.infer<z.ZodObject<OutputShape>>[]
  >;
  importantFields?: (keyof z.infer<z.ZodObject<OutputShape>>)[];
};

export const buildToolSchema = <T extends z.ZodRawShape>(
  fn: (t: TranslationHelper['t']) => T
) => fn;

export type DynamicToolDefinition<Shape extends z.ZodRawShape> = {
  name: string;
  description: string;
  schema: z.ZodObject<Shape>;
  handler: (input: z.infer<z.ZodObject<Shape>>) => Promise<CallToolResult>;
};

export interface ToolRegistrar {
  enableToolsetAndRefresh(toolset: string): Promise<string>;
}
