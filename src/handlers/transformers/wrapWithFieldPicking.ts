import { parse, SelectionSetNode } from 'graphql';
import { isErrorLike, SafeResult } from '../../types/result.js';

export function wrapWithFieldPicking<I extends { fields?: string }, O>(
  fn: (input: I) => Promise<SafeResult<O>>
): (input: I) => Promise<SafeResult<O>> {
  return async (input: I) => {
    const { fields, ...rest } = input;
    const result = await fn(rest as I);

    if (!fields || isErrorLike(result)) {
      return result;
    }

    const selectionSet = parseFieldsSelection(fields);
    const resultData = result.data;

    if (Array.isArray(resultData)) {
      return {
        kind: 'ok',
        data: resultData.map((item) =>
          pickFieldsFromData(item, selectionSet)
        ) as unknown as O,
      };
    } else if (typeof result === 'object' && result !== null) {
      return {
        kind: 'ok',
        data: pickFieldsFromData(
          resultData as Record<string, unknown>,
          selectionSet
        ) as O,
      };
    } else {
      return result;
    }
  };
}

function parseFieldsSelection(fieldsString: string): SelectionSetNode {
  const query = `query Dummy ${fieldsString}`;
  const ast = parse(query);
  const opDef = ast.definitions[0];
  if (opDef.kind !== 'OperationDefinition' || !opDef.selectionSet) {
    throw new Error('Invalid GraphQL fields');
  }
  return opDef.selectionSet;
}

function pickFieldsFromData(
  data: Record<string, unknown> | null | undefined,
  selectionSet: SelectionSetNode
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const selection of selectionSet.selections) {
    if (selection.kind === 'Field') {
      const key = selection.name.value;
      if (data != null && key in data) {
        const value = data[key];
        if (selection.selectionSet && value != null) {
          result[key] = pickFieldsFromData(
            data[key] as Record<string, unknown>,
            selection.selectionSet
          );
        } else {
          result[key] = data[key];
        }
      }
    }
  }

  return result;
}
