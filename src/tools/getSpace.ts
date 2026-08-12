import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { SpaceSchema } from '../types/zod/backlogOutputDefinition.js';

const getSpaceSchema = buildToolSchema((_t) => ({}));

export const getSpaceTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof getSpaceSchema>,
  (typeof SpaceSchema)['shape']
> => {
  return {
    name: 'get_space',
    description: t(
      'TOOL_GET_SPACE_DESCRIPTION',
      'Returns information about the Backlog space'
    ),
    schema: z.object(getSpaceSchema(t)),
    returnsList: false,
    outputSchema: SpaceSchema,
    importantFields: ['spaceKey', 'name', 'lang', 'timezone'],
    handler: async () => backlog.getSpace(),
  };
};
