import { describe, expect, it } from 'vite-plus/test';
import type { Client } from 'backlog-js';
import { allTools } from './tools.js';
import { createDescriptionHelper } from '../createDescriptionHelper.js';

// The tool list is a public API: renaming an entry breaks every client using it.
describe('allTools', () => {
  const toolNames = allTools(
    {} as Client,
    createDescriptionHelper()
  ).toolsets.flatMap((toolset) =>
    [...toolset.tools, ...(toolset.nativeContentTools ?? [])].map(
      (tool) => tool.name
    )
  );

  it('names every tool in snake_case', () => {
    const offenders = toolNames.filter(
      (name) => !/^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(name)
    );

    expect(offenders).toEqual([]);
  });

  it('gives every tool a distinct name', () => {
    const duplicates = toolNames.filter(
      (name, index) => toolNames.indexOf(name) !== index
    );

    expect(duplicates).toEqual([]);
  });
});
