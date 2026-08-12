import { wrapWithFieldPicking } from './wrapWithFieldPicking';
import type { SafeResult } from '../../types/result';
import { vi, describe, it, expect } from 'vitest';

describe('wrapWithFieldPicking', () => {
  const fullData = {
    id: 1,
    name: 'Project A',
    config: { mode: 'advanced', enabled: true },
    tags: [{ label: 'a' }, { label: 'b' }],
    extra: 'should be ignored',
  };

  const ok = <T>(data: T): SafeResult<T> => ({ kind: 'ok', data });
  const from = <T>(data: T) =>
    wrapWithFieldPicking(vi.fn(async () => ok(data)));

  it('returns everything when fields is not specified', async () => {
    expect(await from(fullData)({})).toEqual(ok(fullData));
  });

  it('returns everything for an empty selection', async () => {
    expect(await from(fullData)({ fields: [] })).toEqual(ok(fullData));
  });

  it('keeps only the named fields', async () => {
    const result = await from(fullData)({ fields: ['id', 'name'] });

    expect(result).toEqual(ok({ id: 1, name: 'Project A' }));
  });

  it('keeps an object field whole', async () => {
    const result = await from(fullData)({ fields: ['config'] });

    expect(result).toEqual(ok({ config: fullData.config }));
  });

  it('keeps an array field whole, rather than emptying it', async () => {
    // The GraphQL version descended into arrays and returned `{}`, dropping the
    // data. Selection is one level deep now, so the array comes back intact.
    const result = await from(fullData)({ fields: ['tags'] });

    expect(result).toEqual(ok({ tags: fullData.tags }));
  });

  it('skips a name the payload does not carry', async () => {
    const result = await from(fullData)({ fields: ['id', 'missing'] });

    expect(result).toEqual(ok({ id: 1 }));
  });

  it('applies the selection to every element of a top-level array', async () => {
    const list = [
      { id: 1, name: 'a', extra: 1 },
      { id: 2, name: 'b', extra: 2 },
    ];

    const result = await from(list)({ fields: ['id'] });

    expect(result).toEqual(ok([{ id: 1 }, { id: 2 }]));
  });

  it('leaves an error result alone', async () => {
    const failure: SafeResult<never> = { kind: 'error', message: 'nope' };
    const wrapped = wrapWithFieldPicking(vi.fn(async () => failure));

    expect(await wrapped({ fields: ['id'] })).toEqual(failure);
  });

  it('leaves a scalar result alone', async () => {
    expect(await from('just a string')({ fields: ['id'] })).toEqual(
      ok('just a string')
    );
  });

  it('does not pass fields through to the wrapped handler', async () => {
    const inner = vi.fn(async (_input: { fields?: string[]; other?: string }) =>
      ok(fullData)
    );
    await wrapWithFieldPicking(inner)({ fields: ['id'], other: 'kept' });

    expect(inner).toHaveBeenCalledWith({ other: 'kept' });
  });
});
