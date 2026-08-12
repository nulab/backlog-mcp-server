import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { ResolutionSchema } from '../types/zod/backlogOutputDefinition.js';

const getResolutionsSchema = buildToolSchema((_t) => ({}));

export const getResolutionsTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof getResolutionsSchema>,
  (typeof ResolutionSchema)['shape']
> => {
  return {
    name: 'get_resolutions',
    description: t(
      'TOOL_GET_RESOLUTIONS_DESCRIPTION',
      'Returns list of issue resolutions'
    ),
    schema: z.object(getResolutionsSchema(t)),
    returnsList: true,
    outputSchema: ResolutionSchema,
    handler: async () => backlog.getResolutions(),
  };
};
