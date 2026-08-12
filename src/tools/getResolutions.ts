import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';

const getResolutionsSchema = buildToolSchema((_t) => ({}));

export const getResolutionsTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof getResolutionsSchema>,
  Entity.Issue.Resolution
> => {
  return {
    name: 'get_resolutions',
    description: t(
      'TOOL_GET_RESOLUTIONS_DESCRIPTION',
      'Returns list of issue resolutions'
    ),
    schema: z.object(getResolutionsSchema(t)),
    returnsList: true,
    outputFields: outputFields<Entity.Issue.Resolution>()(['id', 'name']),
    handler: async () => backlog.getResolutions(),
  };
};
