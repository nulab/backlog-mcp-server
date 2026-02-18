import { wrapWithErrorHandling } from './wrapWithErrorHandling';
import { isErrorLike, type ErrorLike } from '../../types/result';
import { describe, it, expect } from 'vitest';

describe('wrapWithErrorHandling', () => {
  it('returns success result when function resolves', async () => {
    const fn = async (input: number) => input + 1;
    const wrapped = wrapWithErrorHandling(fn);

    const result = await wrapped(1);

    expect(result).toEqual({ kind: 'ok', data: 2 });
  });

  it('returns error result with default handler when function throws', async () => {
    const fn = async () => {
      throw new Error('fail');
    };
    const wrapped = wrapWithErrorHandling(fn);

    const result = await wrapped(undefined as never);

    expect(result.kind).toBe('error');
    if (isErrorLike(result)) {
      expect(result.message).toMatch(/fail/);
    }
  });

  it('uses custom error handler if provided', async () => {
    const fn = async () => {
      throw new Error('original');
    };

    const customHandler = (_: unknown): ErrorLike => ({
      kind: 'error',
      message: 'custom error handled',
    });

    const wrapped = wrapWithErrorHandling(fn, customHandler);

    const result = await wrapped(undefined as never);

    expect(result).toEqual({ kind: 'error', message: 'custom error handled' });
  });
});
