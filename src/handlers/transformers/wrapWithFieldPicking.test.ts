import { wrapWithFieldPicking } from './wrapWithFieldPicking';
import type { SafeResult } from '../../types/result';
import { vi, describe, it, expect } from 'vitest';

describe('wrapWithFieldPicking', () => {
  const fullData = {
    id: 1,
    name: 'Project A',
    config: {
      mode: 'advanced',
      enabled: true,
    },
    extra: 'should be ignored',
  };

  const successResult: SafeResult<typeof fullData> = {
    kind: 'ok',
    data: fullData,
  };

  const mockFn = vi.fn(async () => successResult);

  it('returns full data when fields is not specified', async () => {
    const wrapped = wrapWithFieldPicking(mockFn);
    const result = await wrapped({});

    expect(result).toEqual(successResult);
  });

  it('filters top-level fields', async () => {
    const wrapped = wrapWithFieldPicking(mockFn);
    const result = await wrapped({
      fields: `{ id name }`,
    });

    expect(result).toEqual({
      kind: 'ok',
      data: {
        id: 1,
        name: 'Project A',
      },
    });
  });

  it('filters nested fields', async () => {
    const wrapped = wrapWithFieldPicking(mockFn);
    const result = await wrapped({
      fields: `{ config { mode } }`,
    });

    expect(result).toEqual({
      kind: 'ok',
      data: {
        config: {
          mode: 'advanced',
        },
      },
    });
  });

  it('returns original error if result is an error', async () => {
    const errorResult = { kind: 'error', message: 'boom' } as const;
    const errorFn = vi.fn(async () => errorResult);

    const wrapped = wrapWithFieldPicking(errorFn);
    const result = await wrapped({ fields: `{ id }` });

    expect(result).toBe(errorResult);
  });

  it('ignores fields not in data', async () => {
    const wrapped = wrapWithFieldPicking(mockFn);
    const result = await wrapped({ fields: `{ id unknown }` });

    expect(result).toEqual({
      kind: 'ok',
      data: {
        id: 1,
      },
    });
  });

  it('filters arrays of objects', async () => {
    const arrFn = vi.fn(
      async (_) =>
        ({
          kind: 'ok',
          data: [
            { id: 1, name: 'A', unused: true },
            { id: 2, name: 'B', unused: false },
          ],
        }) as const
    );

    const wrapped = wrapWithFieldPicking(arrFn);
    const result = await wrapped({ fields: `{ name }` });

    expect(result).toEqual({
      kind: 'ok',
      data: [{ name: 'A' }, { name: 'B' }],
    });
  });
});
