import { isErrorLike, SafeResult } from '../../types/result.js';

/**
 * Narrows a successful result to the fields the caller asked for.
 *
 * `fields` is a list of top-level names, validated against the tool's own enum
 * before it reaches here, so an unknown name is rejected by the protocol rather
 * than dropped in silence. A missing or empty list returns everything.
 *
 * One level deep on purpose. This used to accept a GraphQL selection set and
 * parse it with the `graphql` package: ~1 MB for a single `parse` call, a grammar
 * that accepted aliases, fragments, arguments and directives and then honoured
 * none of them, and a descent into an array field that returned `{}` and lost the
 * data outright.
 */
export function wrapWithFieldPicking<I extends { fields?: string[] }, O>(
  fn: (input: I) => Promise<SafeResult<O>>
): (input: I) => Promise<SafeResult<O>> {
  return async (input: I) => {
    const { fields, ...rest } = input;
    const result = await fn(rest as I);

    if (!fields || fields.length === 0 || isErrorLike(result)) {
      return result;
    }

    const data = result.data;

    if (Array.isArray(data)) {
      return {
        kind: 'ok',
        data: data.map((item) => pick(item, fields)) as unknown as O,
      };
    }

    if (typeof data === 'object' && data !== null) {
      return {
        kind: 'ok',
        data: pick(data as Record<string, unknown>, fields) as O,
      };
    }

    // A scalar has no fields to narrow.
    return result;
  };
}

function pick(value: unknown, fields: string[]): unknown {
  if (typeof value !== 'object' || value === null) return value;

  const source = value as Record<string, unknown>;
  const picked: Record<string, unknown> = {};
  for (const field of fields) {
    if (field in source) picked[field] = source[field];
  }
  return picked;
}
