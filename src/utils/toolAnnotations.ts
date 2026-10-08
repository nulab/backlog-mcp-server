import type { ToolAnnotations } from '@modelcontextprotocol/server';

/**
 * The MCP hints a tool is registered with, derived from the verb its name
 * starts with.
 *
 * Every hint is set explicitly, because the protocol's defaults are the
 * cautious ones: a tool that omits `destructiveHint` and `openWorldHint` is
 * read by a client as destructive and open-world. Left unset, `get_issues`
 * would be presented to the user as a call that can destroy data, which is
 * both wrong and expensive — it is the difference between a client running a
 * read automatically and stopping to ask.
 *
 * Deriving from the verb rather than declaring it per tool is what keeps this
 * honest: the verb is already the one thing every tool name here agrees on,
 * and `toolAnnotations.test.ts` fails for a tool whose verb is not in the
 * table, so a new prefix has to be answered for rather than silently falling
 * back to the defaults.
 */

// `idempotentHint` is only meaningful alongside a write, so it is left off the
// read-only shape rather than asserted as a vacuous truth.
const READ: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
};

// Additive: it brings a new record into being and leaves every existing one
// alone, so it is not destructive. Repeating it creates a second record, hence
// not idempotent.
const CREATE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

// Overwrites part of a record that already exists, so the previous value is
// gone — destructive in the protocol's sense, which is about replacing rather
// than only about deleting. Repeating it lands on the same state.
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

// Flips a read flag — `mark_notification_as_read` and friends. A write, so not
// read-only, but it replaces nothing a user authored and loses nothing: what it
// overwrites is the client's own record of what has been seen. Grouping it with
// `UPDATE` would make a client that confirms destructive calls stop and ask
// before marking a notification read, which is the cost this module exists to
// avoid.
const READ_STATE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

/**
 * `openWorldHint` is false throughout: every tool here reaches one Backlog
 * space over its API and nothing else. The hint is about whether the set of
 * entities a tool can touch is open-ended (a web search, a shell), not about
 * whether the call leaves the process.
 */
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

/**
 * The annotations to register `name` with, or `undefined` when its verb is not
 * in the table.
 *
 * `undefined` rather than a default, so that an unanswered verb surfaces as a
 * failing test instead of as a tool quietly carrying the protocol's cautious
 * defaults into every client.
 *
 * Takes the bare tool name, not the `--prefix`ed one: the prefix is the
 * operator's naming, and reading the verb through it would make the hints
 * depend on a flag.
 */
export function toolAnnotationsFor(name: string): ToolAnnotations | undefined {
  const verb = name.split('_')[0];
  return ANNOTATIONS_BY_VERB[verb];
}
