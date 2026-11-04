import type {
  McpServer,
  StandardSchemaWithJSON,
  ToolAnnotations,
  ToolCallback,
} from '@modelcontextprotocol/server';

export interface BacklogMCPServer extends McpServer {
  __registeredToolNames?: Set<string>;

  registerOnce: (
    name: string,
    description: string,
    schema: StandardSchemaWithJSON,
    handler: ToolCallback<StandardSchemaWithJSON>,
    annotations?: ToolAnnotations
  ) => void;
}

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
    schema: StandardSchemaWithJSON,
    handler: ToolCallback<StandardSchemaWithJSON>,
    annotations?: ToolAnnotations
  ) => {
    if (s.__registeredToolNames!.has(name)) {
      console.warn(`Skipping duplicate tool registration: ${name}`);
      return;
    }
    s.__registeredToolNames!.add(name);
    s.registerTool(
      name,
      { description, inputSchema: schema, annotations },
      handler
    );
  };

  return s;
}
