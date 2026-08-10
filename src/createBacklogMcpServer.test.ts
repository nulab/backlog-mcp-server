import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Backlog } from 'backlog-js';
import { McpServer } from '@modelcontextprotocol/server';
import { createDescriptionHelper } from './createDescriptionHelper.js';
import { createBacklogMcpServer } from './createBacklogMcpServer.js';
import { registerDynamicTools, registerTools } from './registerTools.js';
import { organizationTools } from './tools/dynamicTools/organizations.js';
import { buildToolsetGroup } from './utils/toolsetUtils.js';
import type { BacklogClientRegistry } from './utils/backlogClientRegistry.js';

vi.mock('@modelcontextprotocol/server', () => ({
  McpServer: vi.fn(function (this: Record<string, unknown>) {
    this.registerTool = vi.fn();
  }),
}));

vi.mock('./registerTools.js', () => ({
  registerTools: vi.fn(),
  registerDynamicTools: vi.fn(),
}));

vi.mock('./utils/toolsetUtils.js', () => ({
  buildToolsetGroup: vi.fn().mockReturnValue({ toolsets: [] }),
}));

vi.mock('./utils/toolRegistrar.js', () => ({}));

vi.mock('./tools/dynamicTools/organizations.js', () => ({
  organizationTools: vi.fn().mockReturnValue({ toolsets: [] }),
}));

describe('createBacklogMcpServer', () => {
  const mockBacklog = {} as Backlog;
  const mockClientRegistry = {} as BacklogClientRegistry;
  const mockDescriptionHelper = createDescriptionHelper();
  const mcpOption = {
    useFields: false,
    maxTokens: 50000,
    prefix: '',
    useOrganization: true,
  };

  const baseConfig = {
    version: '1.0.0',
    useFields: false,
    backlog: mockBacklog,
    clientRegistry: mockClientRegistry,
    descriptionHelper: mockDescriptionHelper,
    enabledToolsets: ['all'],
    mcpOption,
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
      mockDescriptionHelper,
      ['all']
    );
  });

  // Under the stateless HTTP model the factory runs once per request, so a
  // caller that shares one group avoids rebuilding the whole tool tree each time.
  it('registers from a caller-supplied toolset group instead of building one', () => {
    const sharedToolsetGroup = { toolsets: [] } as any;

    createBacklogMcpServer({ ...baseConfig, toolsetGroup: sharedToolsetGroup });

    expect(buildToolsetGroup).not.toHaveBeenCalled();
    expect(registerTools).toHaveBeenCalledWith(
      expect.anything(),
      sharedToolsetGroup,
      mcpOption
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

  it('registers list_organizations when more than one organization is configured', () => {
    createBacklogMcpServer(baseConfig);
    expect(organizationTools).toHaveBeenCalledWith(
      mockClientRegistry,
      mockDescriptionHelper
    );
    expect(registerDynamicTools).toHaveBeenCalledTimes(1);
  });

  // A single Backlog space leaves `list_organizations` nothing to report, and
  // the `organization` parameter its description refers to is not published
  // either, so advertising the tool would only mislead.
  it('does not register list_organizations for a single organization', () => {
    createBacklogMcpServer({
      ...baseConfig,
      mcpOption: { ...mcpOption, useOrganization: false },
    });

    expect(organizationTools).not.toHaveBeenCalled();
    expect(registerDynamicTools).not.toHaveBeenCalled();
  });

  it('passes mcpOption.prefix to registerDynamicTools', () => {
    const configWithPrefix = {
      ...baseConfig,
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
      }),
      expect.anything()
    );
  });

  it('sets default title when useFields is false', () => {
    createBacklogMcpServer({ ...baseConfig, useFields: false });
    expect(McpServer).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'backlog',
      }),
      expect.anything()
    );
  });

  it('passes version to McpServer', () => {
    createBacklogMcpServer({ ...baseConfig, version: '2.0.0' });
    expect(McpServer).toHaveBeenCalledWith(
      expect.objectContaining({
        version: '2.0.0',
      }),
      expect.anything()
    );
  });

  it('publishes a tools/list cache hint when the tool list is fixed', () => {
    createBacklogMcpServer(baseConfig);
    expect(McpServer).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        cacheHints: {
          'tools/list': { ttlMs: 5 * 60 * 1000, cacheScope: 'public' },
        },
      })
    );
  });
});
