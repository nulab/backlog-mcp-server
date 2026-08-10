import { z } from 'zod';
import { generateFieldsDescription } from './generateFieldsDescription';
import { describe, it, expect } from 'vitest';

describe('generateFieldsDescription', () => {
  const schema = z.object({
    id: z.number(),
    name: z.string(),
    active: z.boolean(),
    tags: z.array(z.object({ label: z.string() })),
    nested: z
      .object({
        foo: z.string(),
        bar: z.number(),
      })
      .optional(),
  });

  it('shows every field in the example when none are singled out', () => {
    const desc = generateFieldsDescription(schema, []);

    expect(desc).toContain('Example (query):');
    for (const field of ['id', 'name', 'active', 'tags', 'nested']) {
      expect(desc).toContain(field);
    }
  });

  it('does not repeat the field list when the example already holds it all', () => {
    const desc = generateFieldsDescription(schema, []);

    expect(desc).not.toContain('All selectable fields:');
  });

  it('narrows the example to the important fields', () => {
    const desc = generateFieldsDescription(schema, ['id', 'name']);
    const example = desc.split('All selectable fields:')[0]!;

    expect(example).toContain('id');
    expect(example).toContain('name');
    expect(example).not.toContain('active');
  });

  it('lists the rest separately when the example is only a subset', () => {
    const desc = generateFieldsDescription(schema, ['id']);

    expect(desc).toContain(
      'All selectable fields: id, name, active, tags, nested'
    );
  });

  it('claims no types, so it cannot claim a wrong one', () => {
    // The dropped type definition had no ZodArray branch, so `tags` was
    // published as `String` and nested objects collapsed to `JSON`.
    const desc = generateFieldsDescription(schema, []);

    expect(desc).not.toContain('type ');
    expect(desc).not.toContain('String');
    expect(desc).not.toContain('Int!');
    expect(desc).not.toContain('JSON');
  });
});
