import {
  McpServer,
  ToolCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ZodRawShapeCompat } from '@modelcontextprotocol/sdk/server/zod-compat.js';

// Extended type that has the MCP core, a set of registered tool names, and a registration function
export interface BacklogMCPServer extends McpServer {
  __registeredToolNames?: Set<string>;

  registerOnce: (
    name: string,
    description: string,
    schema: ZodRawShapeCompat,
    handler: ToolCallback<ZodRawShapeCompat>
  ) => void;
}

// This function takes an McpServer instance and extends it with a tool registration mechanism that prevents duplicate tool registrations.
export function wrapServerWithToolRegistry(
  server: McpServer
): BacklogMCPServer {
  const s = server as BacklogMCPServer;

  if (!s.__registeredToolNames) {
    s.__registeredToolNames = new Set();
  }

  s.registerOnce = (
    name: string,
    description: string,
    schema: ZodRawShapeCompat,
    handler: ToolCallback<ZodRawShapeCompat>
  ) => {
    if (s.__registeredToolNames!.has(name)) {
      console.warn(`Skipping duplicate tool registration: ${name}`);
      return;
    }
    s.__registeredToolNames!.add(name);
    s.tool(name, description, schema, handler);
  };

  return s;
}
