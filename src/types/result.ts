export type ErrorLike = {
  kind: 'error';
  message: string;
  code?: number;
  data?: unknown;
};

export type Success<T> = {
  kind: 'ok';
  data: T;
};

export type SafeResult<T> = Success<T> | ErrorLike;

export function isErrorLike<T>(res: SafeResult<T>): res is ErrorLike {
  return res.kind === 'error';
}
