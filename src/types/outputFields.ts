// Field names must exist at runtime (`--optimize-response` publishes them as an
// enum), so they are written out and checked against the `backlog-js` type in
// both directions: a missing or unknown field is a build error.
type Missing<T, K extends readonly PropertyKey[]> = Exclude<keyof T, K[number]>;

export function outputFields<T>() {
  return <K extends readonly (keyof T)[]>(
    keys: K
  ): [Missing<T, K>] extends [never]
    ? readonly (keyof T)[]
    : { __outputFieldsMissing: Missing<T, K> } => keys as never;
}
