import { ErrorLike, SafeResult } from '../types/result.js';

/**
 * Runs a tool handler safely, catching any errors and converting to SafeResult.
 * The `onError` handler defines how to turn unknown errors into ErrorLike objects.
 */
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
