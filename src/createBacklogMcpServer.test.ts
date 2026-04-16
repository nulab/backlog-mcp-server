import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Backlog } from 'backlog-js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createTranslationHelper } from './createTranslationHelper.js';
import { createBacklogMcpServer } from './createBacklogMcpServer.js';
import { registerDynamicTools, registerTools } from './registerTools.js';
import { organizationTools } from './tools/dynamicTools/organizations.js';
import { buildToolsetGroup } from './utils/toolsetUtils.js';
import { createToolRegistrar } from './utils/toolRegistrar.js';
import { dynamicTools } from './tools/dynamicTools/toolsets.js';
import type { BacklogClientRegistry } from './utils/backlogClientRegistry.js';

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

vi.mock('./tools/dynamicTools/organizations.js', () => ({
  organizationTools: vi.fn().mockReturnValue({ toolsets: [] }),
}));

describe('createBacklogMcpServer', () => {
  const mockBacklog = {} as Backlog;
  const mockClientRegistry = {} as BacklogClientRegistry;
  const mockTransHelper = createTranslationHelper();
  const mcpOption = { useFields: false, maxTokens: 50000, prefix: '' };

  const baseConfig = {
    version: '1.0.0',
    useFields: false,
    backlog: mockBacklog,
    clientRegistry: mockClientRegistry,
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

  it('does not register dynamic toolsets when dynamicToolsets is false', () => {
    createBacklogMcpServer({ ...baseConfig, dynamicToolsets: false });
    expect(createToolRegistrar).not.toHaveBeenCalled();
    expect(dynamicTools).not.toHaveBeenCalled();
    // organizationTools are always registered regardless of dynamicToolsets
    expect(organizationTools).toHaveBeenCalledWith(
      mockClientRegistry,
      mockTransHelper
    );
    expect(registerDynamicTools).toHaveBeenCalledTimes(1);
  });

  it('registers dynamic toolsets when dynamicToolsets is true', () => {
    createBacklogMcpServer({ ...baseConfig, dynamicToolsets: true });
    expect(createToolRegistrar).toHaveBeenCalled();
    expect(dynamicTools).toHaveBeenCalled();
    // organizationTools + dynamic toolsets = 2 calls
    expect(registerDynamicTools).toHaveBeenCalledTimes(2);
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

  it('sets title with field selection when useFields is true', () => {
    createBacklogMcpServer({ ...baseConfig, useFields: true });
    expect(McpServer).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'backlog (field selection enabled)',
      })
    );
  });

  it('sets default title when useFields is false', () => {
    createBacklogMcpServer({ ...baseConfig, useFields: false });
    expect(McpServer).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'backlog',
      })
    );
  });

  it('passes version to McpServer', () => {
    createBacklogMcpServer({ ...baseConfig, version: '2.0.0' });
    expect(McpServer).toHaveBeenCalledWith(
      expect.objectContaining({
        version: '2.0.0',
      })
    );
  });

  it('passes correct arguments to dynamicTools when dynamicToolsets is true', () => {
    const mockToolsetGroup = { toolsets: [] };
    const mockRegistrar = { register: vi.fn() };
    vi.mocked(buildToolsetGroup).mockReturnValue(mockToolsetGroup as any);
    vi.mocked(createToolRegistrar).mockReturnValue(mockRegistrar as any);

    createBacklogMcpServer({ ...baseConfig, dynamicToolsets: true });

    expect(createToolRegistrar).toHaveBeenCalledWith(
      expect.anything(),
      mockToolsetGroup,
      mcpOption
    );
    expect(dynamicTools).toHaveBeenCalledWith(
      mockRegistrar,
      mockTransHelper,
      mockToolsetGroup
    );
  });
});
