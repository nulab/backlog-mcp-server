import { z } from 'zod';
import { generateFieldsDescription } from './generateFieldsDescription';
import { describe, it, expect } from 'vitest';

describe('generateFieldsDescription', () => {
  const schema = z.object({
    id: z.number(),
    name: z.string(),
    active: z.boolean(),
    nested: z
      .object({
        foo: z.string(),
        bar: z.number(),
      })
      .optional(),
  });

  it('should generate correct GraphQL description with importantFields', () => {
    const desc = generateFieldsDescription(schema, []);

    expect(desc).toContain('Example (query):');
    expect(desc).toContain('id');
    expect(desc).toContain('name');

    expect(desc).toContain('type Output {');
    expect(desc).toContain('id: Int!');
    expect(desc).toContain('name: String!');
    expect(desc).toContain('active: Boolean!');
    expect(desc).toContain('nested: JSON');
  });

  it('should include all fields in SDL even if not in importantFields', () => {
    const desc = generateFieldsDescription(schema, ['id']);

    expect(desc).toContain('id');
    expect(desc).toContain('name: String!');
    expect(desc).toContain('active: Boolean!');
    expect(desc).toContain('nested: JSON');
  });

  it('should not duplicate fields in SDL and example', () => {
    const desc = generateFieldsDescription(schema, ['id', 'name']);

    const examplePart = desc.split('Output schema')[0];
    expect(examplePart).toContain('id');
    expect(examplePart).toContain('name');
    expect(examplePart).not.toContain('active');
  });
});
