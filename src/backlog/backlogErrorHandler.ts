import { ErrorLike } from '../types/result.js';
import { parseBacklogAPIError } from './parseBacklogAPIError.js';

export const backlogErrorHandler = (err: unknown): ErrorLike => {
  const parsed = parseBacklogAPIError(err);
  return {
    kind: 'error',
    message: parsed.message,
  };
};
