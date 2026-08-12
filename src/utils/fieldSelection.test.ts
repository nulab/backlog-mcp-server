import { describe, it, expect } from 'vitest';
import { fieldSelection, fieldSelectionSchema } from './fieldSelection';

describe('fieldSelection', () => {
  const schema = ['id', 'name', 'active', 'tags'] as const;

  it('offers every field of the output schema', () => {
    expect(fieldSelection(schema)?.names).toEqual([
      'id',
      'name',
      'active',
      'tags',
    ]);
  });

  it('points at the important fields without narrowing the choice', () => {
    const selection = fieldSelection(schema, ['id', 'name']);

    expect(selection?.description).toContain('id, name');
    // still selectable, just not advertised as the common case
    expect(selection?.names).toContain('active');
  });

  it('ignores an important field the schema does not have', () => {
    expect(fieldSelection(schema, ['id', 'gone'])?.description).not.toContain(
      'gone'
    );
  });

  it('offers nothing for a schema with no fields', () => {
    // z.enum([]) cannot be constructed, and there would be nothing to pick
    expect(fieldSelection([])).toBeUndefined();
    expect(fieldSelectionSchema([])).toBeUndefined();
  });

  it('claims no types, so it cannot claim a wrong one', () => {
    // The GraphQL type definition this replaced had no ZodArray branch, so
    // `tags` was published as `String`.
    const description = fieldSelection(schema)!.description;

    for (const claim of ['String', 'Int!', 'JSON', 'type ']) {
      expect(description).not.toContain(claim);
    }
  });
});

describe('fieldSelectionSchema', () => {
  const schema = ['id', 'name'] as const;
  const fields = fieldSelectionSchema(schema)!;

  it('accepts a list of known field names', () => {
    expect(fields.safeParse(['id', 'name']).success).toBe(true);
  });

  it('accepts being left out', () => {
    expect(fields.safeParse(undefined).success).toBe(true);
  });

  it('rejects a name the tool does not have, rather than dropping it', () => {
    expect(fields.safeParse(['id', 'nope']).success).toBe(false);
  });

  it('rejects the old GraphQL selection string', () => {
    expect(fields.safeParse('{ id name }').success).toBe(false);
  });
});
