import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';

const getProjectSchema = buildToolSchema((t) => ({
  projectId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_GET_PROJECT_PROJECT_ID',
        'The numeric ID of the project (e.g., 12345)'
      )
    ),
  projectKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_GET_PROJECT_PROJECT_KEY',
        "The key of the project (e.g., 'PROJECT')"
      )
    ),
}));

export const getProjectTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof getProjectSchema>,
  Entity.Project.Project
> => {
  return {
    name: 'get_project',
    description: t(
      'TOOL_GET_PROJECT_DESCRIPTION',
      'Returns information about a specific project'
    ),
    schema: z.object(getProjectSchema(t)),
    returnsList: false,
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
    handler: async ({ projectId, projectKey }) => {
      const result = resolveIdOrKey(
        'project',
        { id: projectId, key: projectKey },
        t
      );
      if (!result.ok) {
        throw result.error;
      }
      return backlog.getProject(result.value);
    },
  };
};
