import { ErrorLike, SafeResult } from '../../types/result.js';
import { runToolSafely } from '../../utils/runToolSafely.js';

export function wrapWithErrorHandling<I, O>(
  fn: (input: I) => Promise<O>,
  onError?: (err: unknown) => ErrorLike
): (input: I) => Promise<SafeResult<O>> {
  return runToolSafely(fn, onError);
}
