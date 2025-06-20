import { registerTools } from '../registerTools.js';
import { MCPOptions } from '../types/mcp.js';
import { ToolRegistrar } from '../types/tool.js';
import { ToolsetGroup } from '../types/toolsets.js';
import { enableToolset } from '../utils/toolsetUtils.js';
import { BacklogMCPServer } from './wrapServerWithToolRegistry.js';

export function createToolRegistrar(
  server: BacklogMCPServer,
  toolsetGroup: ToolsetGroup,
  options: MCPOptions
): ToolRegistrar {
  return {
    async enableToolsetAndRefresh(toolset: string): Promise<string> {
      const msg = enableToolset(toolsetGroup, toolset);
      registerTools(server, toolsetGroup, options);
      await server.server.sendToolListChanged();
      return msg;
    },
  };
}
