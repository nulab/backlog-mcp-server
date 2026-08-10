import { describe, expect, it, vi, afterEach } from 'vitest';
import type { Backlog } from 'backlog-js';
import { buildToolsetGroup } from './toolsetUtils.js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

/**
 * This file used to cover `getToolset` and `enableToolset`, which existed only
 * for `enable_toolset`. Both are gone with it; `buildToolsetGroup` is what is
 * left in this module, and it had no direct coverage.
 */
describe('buildToolsetGroup', () => {
  const backlog = {} as Backlog;
  const helper = createDescriptionHelper();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const names = (enabled: string[]) =>
    buildToolsetGroup(backlog, helper, enabled)
      .toolsets.filter((ts) => ts.enabled)
      .map((ts) => ts.name);

  it("enables every toolset for 'all'", () => {
    const group = buildToolsetGroup(backlog, helper, ['all']);

    expect(group.toolsets.length).toBeGreaterThan(1);
    expect(group.toolsets.every((ts) => ts.enabled)).toBe(true);
  });

  it('enables only the named toolsets', () => {
    expect(names(['space', 'wiki']).sort()).toEqual(['space', 'wiki']);
  });

  it('enables nothing when nothing is named', () => {
    expect(names([])).toEqual([]);
  });

  it('returns every toolset regardless, marking the rest disabled', () => {
    const group = buildToolsetGroup(backlog, helper, ['space']);

    expect(group.toolsets.length).toBeGreaterThan(1);
    expect(group.toolsets.filter((ts) => !ts.enabled).length).toBeGreaterThan(
      0
    );
  });

  it('warns about a name that matches no toolset, and ignores it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(names(['space', 'nope'])).toEqual(['space']);
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toContain('nope');
  });
});
