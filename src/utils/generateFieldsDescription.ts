import { z, ZodRawShape } from 'zod';

/**
 * Builds the description of the `fields` parameter that `--optimize-response`
 * adds to every tool.
 *
 * This text is prompt: it is published on all ~62 tools in every `tools/list`,
 * so its size is a fixed cost paid up front against a response saving that only
 * materialises when the model actually selects fields. It is deliberately two
 * short parts — an example query, and the full field list when the example is
 * only a subset of it.
 *
 * It used to also emit a GraphQL type definition for the output. That was
 * dropped: it repeated every field name a second line at a time, it was the
 * larger half of the text, and its types were wrong for arrays —
 * `mapZodTypeToGraphQLType` had no `ZodArray` branch, so `z.array(TagSchema)`
 * was published as `String`. Field names are what a selection needs.
 */
export function generateFieldsDescription(
  outputSchema: z.ZodObject<ZodRawShape>,
  importantFields: string[] = []
): string {
  const allFields = Object.keys(outputSchema.shape);
  const exampleFields =
    importantFields.length > 0 ? importantFields : allFields;

  const lines = [
    'Specify the fields to retrieve using GraphQL query syntax.',
    'Example (query):',
    '{',
    ...exampleFields.map((field) => `  ${field}`),
    '}',
  ];

  // Only worth listing separately when the example does not already show them
  // all, which is the case for the tools that declare importantFields.
  if (exampleFields.length < allFields.length) {
    lines.push(`All selectable fields: ${allFields.join(', ')}`);
  }

  return lines.join('\n');
}
