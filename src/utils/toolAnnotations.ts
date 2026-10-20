import type { ToolAnnotations } from '@modelcontextprotocol/server';

// Every hint is set explicitly: MCP reads an omitted `destructiveHint`/`openWorldHint` as
// destructive and open-world, which would make clients stop to ask before every read.

// `idempotentHint` is only meaningful alongside a write, so it is left off the
// read-only shape rather than asserted as a vacuous truth.
const READ: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
};

// Not destructive (existing records are left alone); not idempotent (repeating creates another).
const CREATE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

// Destructive in the protocol's sense: it replaces an existing value, not only deletes.
// Repeating it lands on the same state.
const UPDATE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: false,
};

const DELETE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: false,
};

// Not `UPDATE`: it overwrites only the read state, and treating it as destructive would make
// clients confirm before marking a notification read.
const READ_STATE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

// `openWorldHint` is false: every tool reaches one Backlog space, not an open-ended set
// of entities (the hint is not about whether the call leaves the process).
const ANNOTATIONS_BY_VERB: Record<string, ToolAnnotations> = Object.assign(
  // A null prototype, so that a tool named `constructor_…` or `toString_…`
  // reads as an unanswered verb rather than inheriting a method off
  // `Object.prototype` and registering it as the tool's annotations.
  Object.create(null),
  {
    get: READ,
    count: READ,
    list: READ,
    add: CREATE,
    update: UPDATE,
    mark: READ_STATE,
    reset: READ_STATE,
    delete: DELETE,
    remove: DELETE,
  }
);

// `undefined` rather than a default so an unknown verb fails a test. Takes the bare name:
// the hints must not depend on the `--prefix` flag.
export function toolAnnotationsFor(name: string): ToolAnnotations | undefined {
  const verb = name.split('_')[0];
  return ANNOTATIONS_BY_VERB[verb];
}
