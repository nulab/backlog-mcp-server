import { z } from 'zod';
import {
  buildToolSchema,
  DynamicToolDefinition,
  ToolRegistrar,
} from '../../types/tool.js';
import { DynamicToolsetGroup, ToolsetGroup } from '../../types/toolsets.js';
import { TranslationHelper } from '../../createTranslationHelper.js';

export const dynamicTools = function (
  toolRegistrar: ToolRegistrar,
  helper: TranslationHelper,
  toolsetGroup: ToolsetGroup
): DynamicToolsetGroup {
  return {
    toolsets: [
      {
        name: 'dynamic_tools',
        description:
          'Tools for managing Backlog space settings and general information.',
        enabled: true,
        tools: [
          enableToolsetTool(toolRegistrar, helper),
          listAvailableToolsets(helper, toolsetGroup),
          getToolsetTools(helper, toolsetGroup),
        ],
      },
    ],
  };
};

const enableToolsetSchema = buildToolSchema((t) => ({
  toolset: z
    .string()
    .describe(t('TOOL_ENABLE_TOOLSET_TOOLSET', 'Enable a toolset')),
}));

export const enableToolsetTool = (
  toolRegistrar: ToolRegistrar,
  { t }: TranslationHelper
): DynamicToolDefinition<ReturnType<typeof enableToolsetSchema>> => {
  return {
    name: 'enable_toolset',
    description: t(
      'TOOL_ENABLE_TOOLSET_DESCRIPTION',
      'Enable one of the sets of tools the GitHub MCP server provides, use get_toolset_tools and list_available_toolsets first to see what this will enable'
    ),
    schema: z.object(enableToolsetSchema(t)),
    handler: async ({ toolset }) => {
      const msg = await toolRegistrar.enableToolsetAndRefresh(toolset);
      return {
        content: [
          {
            type: 'text',
            text: msg,
          },
        ],
      };
    },
  };
};

export const listAvailableToolsets = (
  { t }: TranslationHelper,
  toolsetGroup: ToolsetGroup
): DynamicToolDefinition<Record<string, never>> => {
  return {
    name: 'list_available_toolsets',
    description: t(
      'TOOL_LIST_AVAILABLE_TOOLSETS_DESCRIPTION',
      'List all available toolsets.'
    ),
    schema: z.object({}),
    handler: async () => {
      const result = toolsetGroup.toolsets.map((ts) => ({
        name: ts.name,
        description: ts.description,
        currentlyEnabled: ts.enabled,
        canEnable: true,
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  };
};

const getToolsetToolsSchema = buildToolSchema((t) => ({
  toolset: z
    .string()
    .describe(t('TOOL_GET_TOOLSET_TOOLS_TOOLSET', 'Toolset name to inspect')),
}));

export const getToolsetTools = (
  { t }: TranslationHelper,
  toolsetGroup: ToolsetGroup
): DynamicToolDefinition<ReturnType<typeof getToolsetToolsSchema>> => {
  return {
    name: 'get_toolset_tools',
    description: t(
      'TOOL_GET_TOOLSET_TOOLS_DESCRIPTION',
      'List all tools in a specific toolset.'
    ),
    schema: z.object(getToolsetToolsSchema(t)),
    handler: async ({ toolset }) => {
      const found = toolsetGroup.toolsets.find((ts) => ts.name === toolset);
      if (!found) {
        return {
          content: [
            {
              type: 'text',
              text: `Toolset '${toolset}' not found.`,
            },
          ],
        };
      }

      const tools = found.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        toolset: found.name,
        canEnable: true,
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(tools, null, 2),
          },
        ],
      };
    },
  };
};
