import { describe, expect, it } from 'vitest';

import { ToolsetGroup } from '../types/toolsets.js';
import { enableToolset, getToolset } from '../utils/toolsetUtils.js';

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

  it('getToolset returns undefined for an unknown toolset', () => {
    expect(getToolset(toolsetGroup, 'unknown')).toBeUndefined();
  });

  it('enableToolset reports an unknown toolset', () => {
    expect(enableToolset(toolsetGroup, 'unknown')).toContain('not found');
  });
});
