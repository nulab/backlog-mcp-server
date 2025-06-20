import { describe, expect, jest, it } from '@jest/globals';
import { z } from 'zod';
import { ToolDefinition, ToolRegistrar } from '../../types/tool.js';
import { ToolsetGroup } from '../../types/toolsets.js';
import {
  enableToolsetTool,
  getToolsetTools,
  listAvailableToolsets,
} from './toolsets.js';

describe('dynamicTools', () => {
  const mockT = (key: string, fallback: string) => fallback;

  const mockTranslationHelper = {
    t: mockT,
    dump: () => ({}),
  };

  const mockToolRegistrar: ToolRegistrar = {
    enableToolsetAndRefresh: jest
      .fn<() => Promise<string>>()
      .mockResolvedValue('Toolset enabled.'),
  };
  const dummyTool: ToolDefinition<any, any> = {
    name: 'get_project_list',
    description: 'Returns a list of projects',
    schema: z.object({}),
    outputSchema: z.object({}),
    handler: async () => ({
      content: [{ type: 'text', text: 'dummy' }],
    }),
  };

  const mockToolsetGroup: ToolsetGroup = {
    toolsets: [
      {
        name: 'project',
        description: 'Project management tools',
        enabled: false,
        tools: [dummyTool],
      },
    ],
  };

  it('enableToolsetTool - returns message after enabling toolset', async () => {
    const tool = enableToolsetTool(mockToolRegistrar, mockTranslationHelper);
    const schema = tool.schema;

    const validInput = schema.parse({ toolset: 'project' });

    const result = await tool.handler(validInput);
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'Toolset enabled.',
        },
      ],
    });

    expect(mockToolRegistrar.enableToolsetAndRefresh).toHaveBeenCalledWith(
      'project'
    );
  });

  it('listAvailableToolsets - returns list of toolsets', async () => {
    const tool = listAvailableToolsets(mockTranslationHelper, mockToolsetGroup);

    const result = await tool.handler({});
    const json = JSON.parse(result.content[0].text as string);

    expect(Array.isArray(json)).toBe(true);
    expect(json[0]).toEqual({
      name: 'project',
      description: 'Project management tools',
      currentlyEnabled: false,
      canEnable: true,
    });
  });

  it('getToolsetTools - returns tools of a specific toolset', async () => {
    const tool = getToolsetTools(mockTranslationHelper, mockToolsetGroup);
    const schema = tool.schema;

    const input = schema.parse({ toolset: 'project' });
    const result = await tool.handler(input);
    const json = JSON.parse(result.content[0].text);

    expect(Array.isArray(json)).toBe(true);
    expect(json[0]).toEqual({
      name: 'get_project_list',
      description: 'Returns a list of projects',
      toolset: 'project',
      canEnable: true,
    });
  });

  it('getToolsetTools - returns error if toolset not found', async () => {
    const tool = getToolsetTools(mockTranslationHelper, mockToolsetGroup);
    const result = await tool.handler({ toolset: 'nonexistent' });

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: "Toolset 'nonexistent' not found.",
        },
      ],
    });
  });
});
