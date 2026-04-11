import { describe, expect, it } from 'vitest';

import { ToolsetGroup } from '../types/toolsets.js';
import {
  enableToolset,
  getEnabledTools,
  getToolset,
  listAvailableToolsets,
  listToolsetTools,
} from '../utils/toolsetUtils.js';

const mockTool = {
  name: 'mock_tool',
  description: 'A mock tool',
  schema: { shape: {} },
  handler: async () => ({ content: [] }),
  outputSchema: {},
};

const toolsetGroup: ToolsetGroup = {
  toolsets: [
    {
      name: 'test_set',
      description: 'Test set',
      enabled: false,
      tools: [mockTool as unknown as any],
    },
  ],
};

describe('Toolset Utils', () => {
  it('getToolset returns correct toolset', () => {
    const ts = getToolset(toolsetGroup, 'test_set');
    expect(ts).toBeDefined();
    expect(ts?.name).toBe('test_set');
  });

  it('enableToolset enables a toolset', () => {
    const msg = enableToolset(toolsetGroup, 'test_set');
    expect(msg).toContain('enabled');
    expect(getToolset(toolsetGroup, 'test_set')?.enabled).toBe(true);
  });

  it('enableToolset returns already enabled message', () => {
    const msg = enableToolset(toolsetGroup, 'test_set');
    expect(msg).toContain('already enabled');
  });

  it('getEnabledTools returns enabled tools', () => {
    const tools = getEnabledTools(toolsetGroup);
    expect(tools.length).toBe(1);
    expect(tools[0].name).toBe('mock_tool');
  });

  it('listAvailableToolsets returns all toolsets', () => {
    const list = listAvailableToolsets(toolsetGroup);
    expect(list.length).toBe(1);
    expect(list[0].name).toBe('test_set');
    expect(list[0].currentlyEnabled).toBe(true);
  });

  it('listToolsetTools returns tools of a toolset', () => {
    const tools = listToolsetTools(toolsetGroup, 'test_set');
    expect(tools.length).toBe(1);
    expect(tools[0].name).toBe('mock_tool');
  });

  it('listToolsetTools returns empty for unknown toolset', () => {
    const tools = listToolsetTools(toolsetGroup, 'unknown');
    expect(tools.length).toBe(0);
  });
});
