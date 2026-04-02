import { backlogErrorHandler } from './backlog/backlogErrorHandler.js';
import { composeToolHandler } from './handlers/builders/composeToolHandler.js';
import { MCPOptions } from './types/mcp.js';
import { DynamicToolDefinition, ToolDefinition } from './types/tool.js';
import { DynamicToolsetGroup, ToolsetGroup } from './types/toolsets.js';
import { BacklogMCPServer } from './utils/wrapServerWithToolRegistry.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

type RegisterOptions<TToolsetGroup extends ToolsetGroup | DynamicToolsetGroup> =
  {
    server: BacklogMCPServer;
    toolsetGroup: TToolsetGroup;
    prefix: string;
    onlyEnabled?: boolean;
    handlerStrategy: (
      tool: TToolsetGroup['toolsets'][number]['tools'][number]
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
        wrapDynamicToolHandler(tool)
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
    handlerStrategy: (tool) => wrapDynamicToolHandler(tool),
  });
}

function registerToolsets<
  TToolsetGroup extends ToolsetGroup | DynamicToolsetGroup,
>({
  server,
  toolsetGroup,
  prefix,
  handlerStrategy,
}: RegisterOptions<TToolsetGroup>) {
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

function wrapDynamicToolHandler<Shape extends z.ZodRawShape>(
  tool: DynamicToolDefinition<Shape>
): (
  input: z.infer<z.ZodObject<Shape>>,
  extra: RequestHandlerExtra<ServerRequest, ServerNotification>
) => Promise<CallToolResult> {
  return async (input, _extra) => {
    try {
      return await tool.handler(input);
    } catch (error) {
      const parsedError = backlogErrorHandler(error);
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: parsedError.message,
          },
        ],
      };
    }
  };
}
