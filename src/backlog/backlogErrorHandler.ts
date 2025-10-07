import { ProjectAccessForbiddenError } from '../errors/ProjectAccessForbiddenError.js';
import { ErrorLike } from '../types/result.js';
import { parseBacklogAPIError } from './parseBacklogAPIError.js';

export const backlogErrorHandler = (err: unknown): ErrorLike => {
  if (err instanceof ProjectAccessForbiddenError) {
    return {
      kind: 'error',
      message: err.message,
      code: err.code,
      data: err.data,
    };
  }

  const parsed = parseBacklogAPIError(err);
  return {
    kind: 'error',
    message: parsed.message,
  };
};
