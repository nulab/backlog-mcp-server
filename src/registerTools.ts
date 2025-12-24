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
  const { useFields, maxTokens, prefix, enabledTools } = options;

  registerToolsets({
    server,
    toolsetGroup,
    prefix,
    enabledTools,
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
  enabledTools,
}: RegisterOptions & { enabledTools?: string[] }) {
  for (const toolset of toolsetGroup.toolsets) {
    for (const tool of toolset.tools) {
      // Enable tool if:
      // 1. Its toolset is enabled, OR
      // 2. The tool is explicitly listed in enabledTools
      const shouldEnableTool =
        toolset.enabled ||
        (enabledTools && enabledTools.includes(tool.name));

      if (!shouldEnableTool) {
        continue;
      }

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
