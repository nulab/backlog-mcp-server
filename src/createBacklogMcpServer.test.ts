import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from './createTranslationHelper.js';
import { createBacklogMcpServer } from './createBacklogMcpServer.js';
import { registerDynamicTools, registerTools } from './registerTools.js';
import { buildToolsetGroup } from './utils/toolsetUtils.js';
import { createToolRegistrar } from './utils/toolRegistrar.js';
import { dynamicTools } from './tools/dynamicTools/toolsets.js';

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn(function (this: Record<string, unknown>) {
    this.tool = vi.fn();
  }),
}));

vi.mock('./registerTools.js', () => ({
  registerTools: vi.fn(),
  registerDynamicTools: vi.fn(),
}));

vi.mock('./utils/toolsetUtils.js', () => ({
  buildToolsetGroup: vi.fn().mockReturnValue({ toolsets: [] }),
}));

vi.mock('./utils/toolRegistrar.js', () => ({
  createToolRegistrar: vi.fn().mockReturnValue({}),
}));

vi.mock('./tools/dynamicTools/toolsets.js', () => ({
  dynamicTools: vi.fn().mockReturnValue({}),
}));

describe('createBacklogMcpServer', () => {
  const mockBacklog = {} as Backlog;
  const mockTransHelper = createTranslationHelper();
  const mcpOption = { useFields: false, maxTokens: 50000, prefix: '' };

  const baseConfig = {
    version: '1.0.0',
    useFields: false,
    backlog: mockBacklog,
    transHelper: mockTransHelper,
    enabledToolsets: ['all'],
    mcpOption,
    dynamicToolsets: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a server wrapped with tool registry', () => {
    const server = createBacklogMcpServer(baseConfig);
    expect(server.__registeredToolNames).toBeInstanceOf(Set);
  });

  it('calls buildToolsetGroup with the correct arguments', () => {
    createBacklogMcpServer(baseConfig);
    expect(buildToolsetGroup).toHaveBeenCalledWith(
      mockBacklog,
      mockTransHelper,
      ['all']
    );
  });

  it('calls registerTools with the toolset group and mcpOption', () => {
    const mockToolsetGroup = { toolsets: [] };
    vi.mocked(buildToolsetGroup).mockReturnValue(mockToolsetGroup as any);

    createBacklogMcpServer(baseConfig);

    expect(registerTools).toHaveBeenCalledWith(
      expect.anything(),
      mockToolsetGroup,
      mcpOption
    );
  });

  it('does not register dynamic tools when dynamicToolsets is false', () => {
    createBacklogMcpServer({ ...baseConfig, dynamicToolsets: false });
    expect(createToolRegistrar).not.toHaveBeenCalled();
    expect(dynamicTools).not.toHaveBeenCalled();
    expect(registerDynamicTools).not.toHaveBeenCalled();
  });

  it('registers dynamic tools when dynamicToolsets is true', () => {
    createBacklogMcpServer({ ...baseConfig, dynamicToolsets: true });
    expect(createToolRegistrar).toHaveBeenCalled();
    expect(dynamicTools).toHaveBeenCalled();
    expect(registerDynamicTools).toHaveBeenCalled();
  });

  it('passes mcpOption.prefix to registerDynamicTools', () => {
    const configWithPrefix = {
      ...baseConfig,
      dynamicToolsets: true,
      mcpOption: { ...mcpOption, prefix: 'backlog_' },
    };

    createBacklogMcpServer(configWithPrefix);

    expect(registerDynamicTools).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'backlog_'
    );
  });
});
