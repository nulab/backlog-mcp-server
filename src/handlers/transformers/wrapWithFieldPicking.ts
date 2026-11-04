import { isErrorLike, SafeResult } from '../../types/result.js';

// Top-level names only, on purpose. `fields` is validated against the tool's enum before it
// gets here, so an unknown name is rejected rather than silently dropped.
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
