import { z } from 'zod';

/**
 * Describes the `fields` parameter that `--optimize-response` adds to a tool.
 *
 * The selectable names come straight from the tool's `outputSchema`, so they are
 * published as a JSON Schema enum rather than described in prose. That is the
 * whole point of the shape: the enum *is* the documentation, an unknown name is
 * rejected by schema validation instead of being silently dropped, and the text
 * shrinks to one sentence per tool.
 *
 * Selection is one level deep. It used to accept a GraphQL selection set, parsed
 * with the `graphql` package, which cost ~1 MB for one `parse` call and accepted
 * far more of the grammar than was ever honoured — aliases, fragments, arguments
 * and directives all parsed and were then quietly ignored, and descending into an
 * array field returned `{}` and lost the data.
 */
export function fieldSelection(
  outputFields: readonly string[],
  importantFields: string[] = []
): { names: string[]; description: string } | undefined {
  const names = [...outputFields];
  // `z.enum([])` is not constructible, and a tool with no known output fields has
  // nothing to select from anyway.
  if (names.length === 0) return undefined;

  const useful = importantFields.filter((field) => names.includes(field));
  const description =
    useful.length > 0
      ? `Return only these fields of the result, to keep the response small. Most callers want: ${useful.join(', ')}.`
      : 'Return only these fields of the result, to keep the response small.';

  return { names, description };
}

/** The `fields` parameter itself, or undefined when the tool has nothing to offer. */
export function fieldSelectionSchema(
  outputFields: readonly string[],
  importantFields: string[] = []
): z.ZodOptional<z.ZodArray<z.ZodEnum<Record<string, string>>>> | undefined {
  const selection = fieldSelection(outputFields, importantFields);
  if (!selection) return undefined;

  return z
    .array(z.enum(selection.names as [string, ...string[]]))
    .optional()
    .describe(selection.description);
}
