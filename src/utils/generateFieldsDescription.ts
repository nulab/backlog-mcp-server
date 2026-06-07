import { z, ZodRawShape, ZodTypeAny } from 'zod';

/**
 * Generate GraphQL like fields and type specs from Zod types
 */
export function generateFieldsDescription(
  outputSchema: z.ZodObject<ZodRawShape>,
  importantFields: string[] = [],
  typeName = 'Output'
): string {
  const allFields = Object.keys(outputSchema.shape);

  // Generate Example Query
  const exampleQueryFields =
    importantFields.length > 0 ? importantFields : allFields;

  // Generate Output Schema
  const gqlTypeDef = generateGraphQLType(typeName, outputSchema);

  return `
Specify the fields to retrieve using GraphQL query syntax.
Example (query):
{
  ${exampleQueryFields.join('\n  ')}
}
Output schema (type definition):
${gqlTypeDef}
  `.trim();
}

function generateGraphQLType(
  typeName: string,
  schema: z.ZodObject<ZodRawShape>
): string {
  const lines: string[] = [`type ${typeName} {`];
  for (const [key, value] of Object.entries(schema.shape)) {
    lines.push(`  ${key}: ${mapZodTypeToGraphQLType(value as ZodTypeAny)}`);
  }
  lines.push('}');
  return lines.join('\n');
}

/**
 * Zod to graphql
 */
function mapZodTypeToGraphQLType(zodType: z.ZodTypeAny): string {
  if (zodType instanceof z.ZodString) return 'String!';
  if (zodType instanceof z.ZodNumber) return 'Int!';
  if (zodType instanceof z.ZodBoolean) return 'Boolean!';
  if (zodType instanceof z.ZodNullable)
    return mapZodTypeToGraphQLType(zodType.unwrap()).replace(/!$/, '');
  if (zodType instanceof z.ZodOptional)
    return mapZodTypeToGraphQLType(zodType.unwrap()).replace(/!$/, '');

  // Spec: a nested part is JSON
  if (zodType instanceof z.ZodObject) return 'JSON';

  return 'String';
}
