import { registerTools } from './registerTools';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Backlog } from 'backlog-js';
import { TranslationHelper } from './createTranslationHelper';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { allTools } from './tools/tools';
import { buildToolsetGroup } from './utils/toolsetUtils.js';
import { wrapServerWithToolRegistry } from './utils/wrapServerWithToolRegistry.js';
import type { Toolset } from './types/toolsets.js';

vi.mock('./handlers/builders/composeToolHandler');

describe('registerTools', () => {
  const mockBacklog = {} as Backlog;
  const mockHelper = {
    t: vi.fn(),
  } as unknown as TranslationHelper;
  const toolsetGroup = allTools(mockBacklog, mockHelper);
  const spaceToolSet = toolsetGroup.toolsets.find(
    (a: Toolset) => a.name === 'space'
  );
  if (spaceToolSet == null) {
    throw new Error(`Toolset "space" not found in allTools. Check test setup.`);
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers tools from enabled toolsets only', () => {
    const mockServer = wrapServerWithToolRegistry({
      tool: vi.fn(),
    } as unknown as McpServer);
    const toolsetGroup = buildToolsetGroup(mockBacklog, mockHelper, ['space']);

    registerTools(mockServer, toolsetGroup, {
      useFields: false,
      prefix: '',
      maxTokens: 5000,
    });
    expect(mockServer.tool).toHaveBeenCalledTimes(spaceToolSet.tools.length);
    const calledToolNames = (mockServer.tool as Mock).mock.calls.map(
      (call) => call[0]
    );
    expect(calledToolNames).toEqual(
      expect.arrayContaining(spaceToolSet.tools.map((a) => a.name))
    );
  });

  it('applies prefix to tool name', () => {
    const mockServer = wrapServerWithToolRegistry({
      tool: vi.fn(),
    } as unknown as McpServer);
    const toolsetGroup = buildToolsetGroup(mockBacklog, mockHelper, ['space']);
    registerTools(mockServer, toolsetGroup, {
      useFields: false,
      prefix: 'backlog.',
      maxTokens: 5000,
    });

    const calledToolNames = (mockServer.tool as Mock).mock.calls.map(
      (call) => call[0]
    );
    expect(calledToolNames).toEqual(
      expect.arrayContaining(spaceToolSet.tools.map((a) => `backlog.${a.name}`))
    );
  });

  it('enables all toolsets when "all" is specified', () => {
    const mockServer = wrapServerWithToolRegistry({
      tool: vi.fn(),
    } as unknown as McpServer);
    const toolsetGroup = buildToolsetGroup(mockBacklog, mockHelper, ['all']);
    registerTools(mockServer, toolsetGroup, {
      useFields: false,
      maxTokens: 1000,
      prefix: '',
    });

    expect(mockServer.tool).toHaveBeenCalledTimes(
      toolsetGroup.toolsets.flatMap((a) => a.tools).length
    );
  });
});
