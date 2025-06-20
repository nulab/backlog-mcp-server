import { describe, expect, it } from '@jest/globals';
import { ErrorLike, isErrorLike } from '../types/result.js';
import { runToolSafely } from './runToolSafely.js';

describe('runToolSafely', () => {
  it('returns ok result when handler succeeds', async () => {
    const mockFn = async (input: number) => input * 2;

    const safeFn = runToolSafely<number, number>(mockFn);

    const result = await safeFn(3);

    expect(result).toEqual({ kind: 'ok', data: 6 });
  });

  it('returns error result when handler throws (default handler)', async () => {
    const mockFn = async () => {
      throw new Error('Boom');
    };

    const safeFn = runToolSafely(mockFn);

    const result = await safeFn(undefined as never);

    expect(result.kind).toBe('error');
    if (isErrorLike(result)) {
      expect(result.message).toMatch(/Boom/);
    } else {
      throw new Error('Expected error result, but got success');
    }
  });

  it('uses custom error handler when provided', async () => {
    const mockFn = async () => {
      throw new Error('Something went wrong');
    };

    const customErrorHandler = (err: unknown): ErrorLike => ({
      kind: 'error',
      message: 'Custom: ' + (err as Error).message,
    });

    const safeFn = runToolSafely(mockFn, customErrorHandler);

    const result = await safeFn(undefined as never);

    expect(result).toEqual({
      kind: 'error',
      message: 'Custom: Something went wrong',
    });
  });
});
