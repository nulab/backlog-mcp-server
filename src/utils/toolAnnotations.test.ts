import { describe, expect, it, vi } from 'vite-plus/test';
import type { Backlog } from 'backlog-js';
import type { DescriptionHelper } from '../createDescriptionHelper';
import { allTools } from '../tools/tools';
import { organizationTools } from '../tools/organizations';
import type { BacklogClientRegistry } from './backlogClientRegistry';
import { toolAnnotationsFor } from './toolAnnotations';

const mockBacklog = {} as Backlog;
const mockHelper = { t: vi.fn() } as unknown as DescriptionHelper;
const mockRegistry = {
  listOrganizations: () => [],
} as unknown as BacklogClientRegistry;

/** Every tool name the server can register, from every toolset. */
const allToolNames = [
  ...allTools(mockBacklog, mockHelper).toolsets,
  ...organizationTools(mockRegistry, mockHelper).toolsets,
].flatMap((toolset) => [
  ...toolset.tools.map((tool) => tool.name),
  ...(toolset.nativeContentTools ?? []).map((tool) => tool.name),
]);

/**
 * What each writing tool is declared to be. Spelled out rather than derived a
 * second time, so that a change to the verb table has to be restated here —
 * the point of the table is that nobody rewrites these hints by accident.
 *
 * Read-only tools are not listed: the test below requires every name absent
 * from this table to be read-only, which is the stronger statement.
 */
const WRITE_TOOLS: Record<
  string,
  { destructiveHint: boolean; idempotentHint: boolean }
> = {
  add_category: { destructiveHint: false, idempotentHint: false },
  add_document: { destructiveHint: false, idempotentHint: false },
  add_issue: { destructiveHint: false, idempotentHint: false },
  add_issue_comment: { destructiveHint: false, idempotentHint: false },
  add_project: { destructiveHint: false, idempotentHint: false },
  add_pull_request: { destructiveHint: false, idempotentHint: false },
  add_pull_request_comment: { destructiveHint: false, idempotentHint: false },
  add_related_issue: { destructiveHint: false, idempotentHint: false },
  add_version_milestone: { destructiveHint: false, idempotentHint: false },
  add_watching: { destructiveHint: false, idempotentHint: false },
  add_wiki: { destructiveHint: false, idempotentHint: false },
  update_issue: { destructiveHint: true, idempotentHint: true },
  update_issue_comment: { destructiveHint: true, idempotentHint: true },
  update_project: { destructiveHint: true, idempotentHint: true },
  update_pull_request: { destructiveHint: true, idempotentHint: true },
  update_pull_request_comment: { destructiveHint: true, idempotentHint: true },
  update_version_milestone: { destructiveHint: true, idempotentHint: true },
  update_watching: { destructiveHint: true, idempotentHint: true },
  update_wiki: { destructiveHint: true, idempotentHint: true },
  // Read-state toggles: a write, but nothing a user authored is replaced.
  mark_notification_as_read: { destructiveHint: false, idempotentHint: true },
  mark_watching_as_read: { destructiveHint: false, idempotentHint: true },
  reset_unread_notification_count: {
    destructiveHint: false,
    idempotentHint: true,
  },
  delete_issue: { destructiveHint: true, idempotentHint: true },
  delete_version: { destructiveHint: true, idempotentHint: true },
  delete_watching: { destructiveHint: true, idempotentHint: true },
  remove_related_issue: { destructiveHint: true, idempotentHint: true },
};

describe('toolAnnotationsFor', () => {
  // The reason the module exists: an unannotated tool is read by clients as
  // destructive and open-world, so a tool whose verb nobody answered for has
  // to fail here rather than ship with those defaults.
  it.each(allToolNames)(
    '%s sets readOnlyHint, destructiveHint and openWorldHint explicitly',
    (name) => {
      const annotations = toolAnnotationsFor(name);

      expect(typeof annotations?.readOnlyHint).toBe('boolean');
      expect(typeof annotations?.destructiveHint).toBe('boolean');
      expect(typeof annotations?.openWorldHint).toBe('boolean');
    }
  );

  it.each(allToolNames)('%s reaches only the Backlog API', (name) => {
    expect(toolAnnotationsFor(name)?.openWorldHint).toBe(false);
  });

  it.each(Object.entries(WRITE_TOOLS))(
    '%s is annotated as a write',
    (name, expected) => {
      expect(toolAnnotationsFor(name)).toMatchObject({
        readOnlyHint: false,
        ...expected,
      });
    }
  );

  it('annotates every other tool as read-only', () => {
    const reads = allToolNames.filter((name) => !(name in WRITE_TOOLS));

    expect(reads.length).toBeGreaterThan(0);
    for (const name of reads) {
      expect(toolAnnotationsFor(name), name).toMatchObject({
        readOnlyHint: true,
        destructiveHint: false,
      });
    }
  });

  it('declares every writing tool that exists', () => {
    const declaredButGone = Object.keys(WRITE_TOOLS).filter(
      (name) => !allToolNames.includes(name)
    );

    expect(declaredButGone).toEqual([]);
  });

  it('has no annotations for an unknown verb', () => {
    expect(toolAnnotationsFor('frobnicate_issue')).toBeUndefined();
  });

  // A verb that names a member of `Object.prototype` must read as unanswered
  // rather than registering an inherited method as the tool's annotations.
  it.each(['constructor', 'toString', 'valueOf', 'hasOwnProperty'])(
    'has no annotations for a tool named %s_something',
    (verb) => {
      expect(toolAnnotationsFor(`${verb}_something`)).toBeUndefined();
    }
  );
});
