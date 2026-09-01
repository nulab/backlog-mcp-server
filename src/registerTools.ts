import { z } from 'zod';
import { backlogErrorHandler } from './backlog/backlogErrorHandler.js';
import { composeDynamicToolHandler } from './handlers/builders/composeDynamicToolHandler.js';
import { composeToolHandler } from './handlers/builders/composeToolHandler.js';
import { MCPOptions } from './types/mcp.js';
import { ToolsetGroup } from './types/toolsets.js';
import { BacklogMCPServer } from './utils/wrapServerWithToolRegistry.js';

type RegistrableTool = {
  name: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: z.ZodObject<any>;
};

type RegisterOptions<TTool extends RegistrableTool> = {
  server: BacklogMCPServer;
  toolsets: { enabled: boolean; tools: TTool[] }[];
  prefix: string;
  /**
   * Produces what the tool is registered with. Returning the schema instead of
   * reading it back off the definition keeps the definition immutable, which is
   * required now that one toolset group is shared across per-request servers.
   */
  prepareTool: (tool: TTool) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schema: z.ZodObject<any>;
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
    toolsets: toolsetGroup.toolsets,
    prefix,
    prepareTool: (tool) =>
      composeToolHandler(tool, {
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
    toolsets: toolsetGroup.toolsets.map((toolset) => ({
      enabled: toolset.enabled,
      tools: toolset.dynamicTools ?? [],
    })),
    prefix,
    prepareTool: (tool) =>
      composeDynamicToolHandler(tool, {
        errorHandler: backlogErrorHandler,
        useOrganization,
      }),
  });
}

function registerToolsets<TTool extends RegistrableTool>({
  server,
  toolsets,
  prefix,
  prepareTool,
}: RegisterOptions<TTool>) {
  for (const toolset of toolsets) {
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
