import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';

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
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof getProjectListSchema>,
  Entity.Project.Project
> => {
  return {
    name: 'get_project_list',
    description: t(
      'TOOL_GET_PROJECT_LIST_DESCRIPTION',
      'Returns list of projects'
    ),
    schema: z.object(getProjectListSchema(t)),
    returnsList: true,
    outputFields: outputFields<Entity.Project.Project>()([
      'id',
      'projectKey',
      'name',
      'chartEnabled',
      'useResolvedForChart',
      'subtaskingEnabled',
      'projectLeaderCanEditProjectLeader',
      'useWiki',
      'useFileSharing',
      'useWikiTreeView',
      'useOriginalImageSizeAtWiki',
      'useSubversion',
      'useGit',
      'textFormattingRule',
      'archived',
      'displayOrder',
      'useDevAttributes',
      'grandchildIssueEnabled',
    ]),
    importantFields: ['id', 'projectKey', 'name'],
    handler: async ({ archived, all }) =>
      backlog.getProjects({ archived, all }),
  };
};
