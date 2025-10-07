import { Backlog } from 'backlog-js';
import { backlogErrorHandler } from './backlog/backlogErrorHandler.js';
import { composeToolHandler } from './handlers/builders/composeToolHandler.js';
import { wrapWithProjectGuard } from './handlers/transformers/wrapWithProjectGuard.js';
import { ProjectGuardService } from './guards/ProjectGuardService.js';
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
  options: MCPOptions,
  guardService: ProjectGuardService,
  backlog: Backlog
) {
  const { useFields, maxTokens, prefix } = options;

  registerToolsets({
    server,
    toolsetGroup,
    prefix,
    handlerStrategy: (tool) => {
      const composedHandler = composeToolHandler(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tool as ToolDefinition<any, any>,
        {
          useFields,
          errorHandler: backlogErrorHandler,
          maxTokens,
        }
      );
      // Wrap composedHandler to accept a single argument as expected by wrapWithProjectGuard
      const handlerWithSingleArg = (input: any) =>
        composedHandler(input, { signal: new AbortController().signal });
      return wrapWithProjectGuard(
        handlerWithSingleArg,
        tool.name,
        guardService,
        backlog
      );
    },
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
