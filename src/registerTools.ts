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
  handlerStrategy: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tool: ToolDefinition<any, any> | DynamicToolDefinition<any>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // Register dynamic tools within toolsets (e.g., attachment downloads)
  for (const toolset of toolsetGroup.toolsets) {
    if (!toolset.enabled || !toolset.dynamicTools) {
      continue;
    }

    for (const tool of toolset.dynamicTools) {
      const toolNameWithPrefix = `${prefix}${tool.name}`;
      server.registerOnce(
        toolNameWithPrefix,
        tool.description,
        tool.schema.shape,
        tool.handler
      );
    }
  }
}

export function registerDynamicTools(
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
