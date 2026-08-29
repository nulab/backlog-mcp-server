import { backlogErrorHandler } from './backlog/backlogErrorHandler.js';
import { composeDynamicToolHandler } from './handlers/builders/composeDynamicToolHandler.js';
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
  /**
   * Produces what the tool is registered with. Returning the schema instead of
   * reading it back off the definition keeps the definition immutable, which is
   * required now that one toolset group is shared across per-request servers.
   */
  prepareTool: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tool: ToolDefinition<any, any> | DynamicToolDefinition<any>
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schema: ToolDefinition<any, any>['schema'];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: (...args: any[]) => any;
  };
};

export function registerTools(
  server: BacklogMCPServer,
  toolsetGroup: ToolsetGroup,
  options: MCPOptions
) {
  const { useFields, maxTokens, prefix, useOrganization } = options;

  registerToolsets({
    server,
    toolsetGroup,
    prefix,
    prepareTool: (tool) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      composeToolHandler(tool as ToolDefinition<any, any>, {
        useFields,
        errorHandler: backlogErrorHandler,
        maxTokens,
        useOrganization,
      }),
  });

  // Tools that build their own result, registered from the same toolsets so
  // that `--enable-toolsets` and the prefix cover them too.
  registerToolsets({
    server,
    toolsetGroup: {
      toolsets: toolsetGroup.toolsets.map((toolset) => ({
        name: toolset.name,
        description: toolset.description,
        enabled: toolset.enabled,
        tools: toolset.dynamicTools ?? [],
      })),
    },
    prefix,
    prepareTool: (tool) =>
      composeDynamicToolHandler(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tool as DynamicToolDefinition<any>,
        { errorHandler: backlogErrorHandler, useOrganization }
      ),
  });
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
    prepareTool: (tool) => ({ schema: tool.schema, handler: tool.handler }),
  });
}

function registerToolsets({
  server,
  toolsetGroup,
  prefix,
  prepareTool,
}: RegisterOptions) {
  for (const toolset of toolsetGroup.toolsets) {
    if (!toolset.enabled) {
      continue;
    }

    for (const tool of toolset.tools) {
      const toolNameWithPrefix = `${prefix}${tool.name}`;
      const { schema, handler } = prepareTool(tool);

      server.registerOnce(
        toolNameWithPrefix,
        tool.description,
        schema,
        handler
      );
    }
  }
}
