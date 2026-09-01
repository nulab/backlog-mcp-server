import { registerTools } from './registerTools';
import { McpServer } from '@modelcontextprotocol/server';
import { Backlog } from 'backlog-js';
import { DescriptionHelper } from './createDescriptionHelper';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { allTools } from './tools/tools';
import { buildToolsetGroup } from './utils/toolsetUtils.js';
import { wrapServerWithToolRegistry } from './utils/wrapServerWithToolRegistry.js';
import type { Toolset } from './types/toolsets.js';
import { composeNativeContentToolHandler } from './handlers/builders/composeNativeContentToolHandler.js';

vi.mock('./handlers/builders/composeToolHandler', () => ({
  composeToolHandler: vi.fn((tool) => ({
    schema: tool.schema,
    handler: vi.fn(),
  })),
}));

vi.mock('./handlers/builders/composeNativeContentToolHandler', () => ({
  composeNativeContentToolHandler: vi.fn((tool) => ({
    schema: tool.schema,
    handler: vi.fn(),
  })),
}));

describe('registerTools', () => {
  const mockBacklog = {} as Backlog;
  const mockHelper = {
    t: vi.fn(),
  } as unknown as DescriptionHelper;
  const toolsetGroup = allTools(mockBacklog, mockHelper);
  const spaceToolSet = toolsetGroup.toolsets.find(
    (a: Toolset) => a.name === 'space'
  );
  if (spaceToolSet == null) {
    throw new Error(`Toolset "space" not found in allTools. Check test setup.`);
  }
  const issueToolSet = toolsetGroup.toolsets.find(
    (a: Toolset) => a.name === 'issue'
  );
  if (issueToolSet == null) {
    throw new Error(`Toolset "issue" not found in allTools. Check test setup.`);
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers tools from enabled toolsets only', () => {
    const mockServer = wrapServerWithToolRegistry({
      registerTool: vi.fn(),
    } as unknown as McpServer);
    const toolsetGroup = buildToolsetGroup(mockBacklog, mockHelper, ['space']);

    registerTools(mockServer, toolsetGroup, {
      useFields: false,
      prefix: '',
      maxTokens: 5000,
      useOrganization: false,
    });
    expect(mockServer.registerTool).toHaveBeenCalledTimes(
      spaceToolSet.tools.length
    );
    const calledToolNames = (mockServer.registerTool as Mock).mock.calls.map(
      (call) => call[0]
    );
    expect(calledToolNames).toEqual(
      expect.arrayContaining(spaceToolSet.tools.map((a) => a.name))
    );
  });

  it('applies prefix to tool name', () => {
    const mockServer = wrapServerWithToolRegistry({
      registerTool: vi.fn(),
    } as unknown as McpServer);
    const toolsetGroup = buildToolsetGroup(mockBacklog, mockHelper, ['space']);
    registerTools(mockServer, toolsetGroup, {
      useFields: false,
      prefix: 'backlog.',
      maxTokens: 5000,
      useOrganization: false,
    });

    const calledToolNames = (mockServer.registerTool as Mock).mock.calls.map(
      (call) => call[0]
    );
    expect(calledToolNames).toEqual(
      expect.arrayContaining(spaceToolSet.tools.map((a) => `backlog.${a.name}`))
    );
  });

  it('applies prefix to dynamic tool names', () => {
    const mockServer = wrapServerWithToolRegistry({
      registerTool: vi.fn(),
    } as unknown as McpServer);
    const toolsetGroup = buildToolsetGroup(mockBacklog, mockHelper, ['issue']);

    registerTools(mockServer, toolsetGroup, {
      useFields: false,
      prefix: 'backlog.',
      maxTokens: 5000,
      useOrganization: false,
    });

    const calledToolNames = (mockServer.registerTool as Mock).mock.calls.map(
      (call) => call[0]
    );
    expect(calledToolNames).toEqual(
      expect.arrayContaining(
        (issueToolSet.nativeContentTools ?? []).map(
          (tool) => `backlog.${tool.name}`
        )
      )
    );
  });

  it('enables all toolsets when "all" is specified', () => {
    const mockServer = wrapServerWithToolRegistry({
      registerTool: vi.fn(),
    } as unknown as McpServer);
    const toolsetGroup = buildToolsetGroup(mockBacklog, mockHelper, ['all']);
    registerTools(mockServer, toolsetGroup, {
      useFields: false,
      maxTokens: 1000,
      prefix: '',
      useOrganization: false,
    });

    expect(mockServer.registerTool).toHaveBeenCalledTimes(
      toolsetGroup.toolsets.flatMap((a) => [
        ...a.tools,
        ...(a.nativeContentTools ?? []),
      ]).length
    );
  });

  it('registers dynamic MCP content tools with their enabled toolset', () => {
    const mockServer = wrapServerWithToolRegistry({
      registerTool: vi.fn(),
    } as unknown as McpServer);
    const toolsetGroup = buildToolsetGroup(mockBacklog, mockHelper, ['issue']);

    registerTools(mockServer, toolsetGroup, {
      useFields: false,
      maxTokens: 1000,
      prefix: '',
      useOrganization: false,
    });

    const calledToolNames = (mockServer.registerTool as Mock).mock.calls.map(
      (call) => call[0]
    );
    expect(calledToolNames).toEqual(
      expect.arrayContaining(
        (issueToolSet.nativeContentTools ?? []).map((tool) => tool.name)
      )
    );
    expect(composeNativeContentToolHandler).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'get_issue_attachment' }),
      expect.objectContaining({ useOrganization: false })
    );
  });

  it('advertises organization on dynamic MCP content tools in multi-org mode', () => {
    const mockServer = wrapServerWithToolRegistry({
      registerTool: vi.fn(),
    } as unknown as McpServer);
    const toolsetGroup = buildToolsetGroup(mockBacklog, mockHelper, ['issue']);

    registerTools(mockServer, toolsetGroup, {
      useFields: false,
      maxTokens: 1000,
      prefix: '',
      useOrganization: true,
    });

    expect(composeNativeContentToolHandler).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'get_issue_attachment' }),
      expect.objectContaining({ useOrganization: true })
    );
  });
});
