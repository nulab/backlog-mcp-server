import { describe, expect, it, vi } from 'vitest';
import { MCPOptions } from '../types/mcp';
import { ToolsetGroup } from '../types/toolsets';
import { createToolRegistrar } from '../utils/toolRegistrar';
import { BacklogMCPServer } from './wrapServerWithToolRegistry';

vi.mock('../registerTools', () => ({
  registerTools: vi.fn(),
}));

const mockSendToolListChanged = vi.fn();

const serverMock = {
  server: {
    sendToolListChanged: mockSendToolListChanged,
  },
  tool: vi.fn(),
  __registeredToolNames: new Set<string>(),
  registerOnce: () => {},
} as unknown as BacklogMCPServer;

const options: MCPOptions = {
  useFields: true,
  maxTokens: 5000,
  prefix: '',
};

describe('createToolRegistrar', () => {
  it('enables a toolset and refreshes tool list', async () => {
    const toolsetGroup: ToolsetGroup = {
      toolsets: [
        {
          name: 'issue',
          description: 'Issue toolset',
          enabled: false,
          tools: [],
        },
      ],
    };

    const registrar = createToolRegistrar(serverMock, toolsetGroup, options);
    const msg = await registrar.enableToolsetAndRefresh('issue');

    expect(msg).toBe('Toolset issue enabled');
    expect(toolsetGroup.toolsets[0].enabled).toBe(true);

    expect(mockSendToolListChanged).toHaveBeenCalled();
  });

  it('returns already enabled message if toolset is already enabled', async () => {
    const toolsetGroup: ToolsetGroup = {
      toolsets: [
        {
          name: 'project',
          description: 'Project toolset',
          enabled: true,
          tools: [],
        },
      ],
    };

    const registrar = createToolRegistrar(serverMock, toolsetGroup, options);
    const msg = await registrar.enableToolsetAndRefresh('project');

    expect(msg).toBe('Toolset project is already enabled');
  });

  it('returns not found message if toolset does not exist', async () => {
    const toolsetGroup: ToolsetGroup = {
      toolsets: [],
    };

    const registrar = createToolRegistrar(serverMock, toolsetGroup, options);
    const msg = await registrar.enableToolsetAndRefresh('unknown');

    expect(msg).toBe('Toolset unknown not found');
  });
});
