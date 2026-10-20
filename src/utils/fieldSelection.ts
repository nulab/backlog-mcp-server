import { z } from 'zod';

// An enum, so schema validation rejects unknown names instead of silently dropping them.
export function fieldSelection(
  outputFields: readonly PropertyKey[],
  importantFields: readonly PropertyKey[] = []
): { names: string[]; description: string } | undefined {
  const names = outputFields.map(String);
  // `z.enum([])` is not constructible, and a tool with no known output fields has
  // nothing to select from anyway.
  if (names.length === 0) return undefined;

  const useful = importantFields.map(String).filter((f) => names.includes(f));
  const description =
    useful.length > 0
      ? `Return only these fields of the result, to keep the response small. Most callers want: ${useful.join(', ')}.`
      : 'Return only these fields of the result, to keep the response small.';

  return { names, description };
}

export function fieldSelectionSchema(
  outputFields: readonly PropertyKey[],
  importantFields: readonly PropertyKey[] = []
): z.ZodOptional<z.ZodArray<z.ZodEnum<Record<string, string>>>> | undefined {
  const selection = fieldSelection(outputFields, importantFields);
  if (!selection) return undefined;

  return z
    .array(z.enum(selection.names as [string, ...string[]]))
    .optional()
    .describe(selection.description);
}
