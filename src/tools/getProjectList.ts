import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { ProjectSchema } from '../types/zod/backlogOutputDefinition.js';

const getProjectListSchema = buildToolSchema((t) => ({
  archived: z
    .boolean()
    .optional()
    .describe(
      t(
        'TOOL_GET_PROJECT_LIST_ARCHIVED',
        'For unspecified parameters, this form returns all projects. For ‘false’ parameters, it returns unarchived projects. For ‘true’ parameters, it returns archived projects.'
      )
    ),
  all: z
    .boolean()
    .optional()
    .describe(
      t(
        'TOOL_GET_PROJECT_LIST_ALL',
        'Only applies to administrators. If ‘true,’ it returns all projects. If ‘false,’ it returns only projects they have joined.'
      )
    ),
}));

export const getProjectListTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof getProjectListSchema>,
  (typeof ProjectSchema)['shape']
> => {
  return {
    name: 'get_project_list',
    description: t(
      'TOOL_GET_PROJECT_LIST_DESCRIPTION',
      'Returns list of projects'
    ),
    schema: z.object(getProjectListSchema(t)),
    outputSchema: ProjectSchema,
    importantFields: ['id', 'projectKey', 'name'],
    handler: async ({ archived, all }) =>
      backlog.getProjects({ archived, all }),
  };
};
