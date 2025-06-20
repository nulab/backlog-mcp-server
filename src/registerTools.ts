import { backlogErrorHandler } from './backlog/backlogErrorHandler.js';
import { composeToolHandler } from './handlers/builders/composeToolHandler.js';
import { MCPOptions } from './types/mcp.js';
import { DynamicToolDefinition, ToolDefinition } from './types/tool.js';
import { DynamicToolsetGroup, ToolsetGroup } from './types/toolsets.js';
import { BacklogMCPServer } from './utils/wrapServerWithToolRegistry.js';

type ToolsetSource = ToolsetGroup | DynamicToolsetGroup;

type RegisterOptions = {
  server: BacklogMCPServer;
  toolsetGroup: ToolsetSource;
  prefix: string;
  onlyEnabled?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handlerStrategy: (
    tool: ToolDefinition<any, any> | DynamicToolDefinition<any>
  ) => (...args: any[]) => any;
};

export function registerTools(
  server: BacklogMCPServer,
  toolsetGroup: ToolsetGroup,
  options: MCPOptions
) {
  const { useFields, maxTokens, prefix } = options;

  registerToolsets({
    server,
    toolsetGroup,
    prefix,
    handlerStrategy: (tool) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      composeToolHandler(tool as ToolDefinition<any, any>, {
        useFields,
        errorHandler: backlogErrorHandler,
        maxTokens,
      }),
  });
}

export function registerDyamicTools(
  server: BacklogMCPServer,
  dynamicToolsetGroup: DynamicToolsetGroup,
  prefix: string
) {
  registerToolsets({
    server,
    toolsetGroup: dynamicToolsetGroup,
    prefix,
    handlerStrategy: (tool) => tool.handler,
  });
}

function registerToolsets({
  server,
  toolsetGroup,
  prefix,
  handlerStrategy,
}: RegisterOptions) {
  for (const toolset of toolsetGroup.toolsets) {
    if (!toolset.enabled) {
      continue;
    }

    for (const tool of toolset.tools) {
      const toolNameWithPrefix = `${prefix}${tool.name}`;
      const handler = handlerStrategy(tool);

      server.registerOnce(
        toolNameWithPrefix,
        tool.description,
        tool.schema.shape,
        handler
      );
    }
  }
}
