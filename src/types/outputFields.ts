/**
 * The list of field names a tool's result carries.
 *
 * Only names are needed at runtime — `--optimize-response` publishes them as the
 * enum of its `fields` parameter — and TypeScript types are erased, so the list
 * has to be written out. What this adds is that writing it wrong does not
 * compile: the names are checked against the `backlog-js` type in both
 * directions, so a field that package gains, or one it never had, is a build
 * error rather than a quiet difference.
 *
 *     outputFields<Entity.Issue.Issue>()(['id', 'projectId', ...])
 *
 * Missing a name fails with the name in the message:
 *
 *     Type '{ __outputFieldsMissing: "childIssueSummary"; }' is missing the
 *     following properties from type 'readonly (keyof Issue)[]'
 *
 * A name the type does not have fails with:
 *
 *     Type '"nope"' is not assignable to type 'keyof Space'
 */
type Missing<T, K extends readonly PropertyKey[]> = Exclude<keyof T, K[number]>;

export function outputFields<T>() {
  return <K extends readonly (keyof T)[]>(
    keys: K
  ): [Missing<T, K>] extends [never]
    ? readonly (keyof T)[]
    : { __outputFieldsMissing: Missing<T, K> } => keys as never;
}
