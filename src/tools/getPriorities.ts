import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';

const getPrioritiesSchema = buildToolSchema((_t) => ({}));

export const getPrioritiesTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof getPrioritiesSchema>,
  Entity.Issue.Priority
> => {
  return {
    name: 'get_priorities',
    description: t(
      'TOOL_GET_PRIORITIES_DESCRIPTION',
      'Returns list of priorities'
    ),
    schema: z.object(getPrioritiesSchema(t)),
    returnsList: true,
    outputFields: outputFields<Entity.Issue.Priority>()(['id', 'name']),
    handler: async () => backlog.getPriorities(),
  };
};
