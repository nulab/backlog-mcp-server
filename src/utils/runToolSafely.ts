import { ErrorLike, SafeResult } from '../types/result.js';

export function runToolSafely<I, O>(
  fn: (input: I) => Promise<O>,
  onError?: (err: unknown) => ErrorLike
): (input: I) => Promise<SafeResult<O>> {
  return async (input: I) => {
    try {
      const data = await fn(input);
      return { kind: 'ok', data };
    } catch (err) {
      if (onError) {
        return onError(err);
      }
      return { kind: 'error', message: 'Unknown: ' + err };
    }
  };
}
