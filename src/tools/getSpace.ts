import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';

const getSpaceSchema = buildToolSchema((_t) => ({}));

export const getSpaceTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<ReturnType<typeof getSpaceSchema>, Entity.Space.Space> => {
  return {
    name: 'get_space',
    description: t(
      'TOOL_GET_SPACE_DESCRIPTION',
      'Returns information about the Backlog space'
    ),
    schema: z.object(getSpaceSchema(t)),
    returnsList: false,
    outputFields: outputFields<Entity.Space.Space>()([
      'spaceKey',
      'name',
      'ownerId',
      'lang',
      'timezone',
      'reportSendTime',
      'textFormattingRule',
      'created',
      'updated',
    ]),
    importantFields: ['spaceKey', 'name', 'lang', 'timezone'],
    handler: async () => backlog.getSpace(),
  };
};
