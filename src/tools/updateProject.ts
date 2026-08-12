import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';

const updateProjectSchema = buildToolSchema((t) => ({
  projectId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_UPDATE_PROJECT_PROJECT_ID',
        'The numeric ID of the project (e.g., 12345)'
      )
    ),
  projectKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_UPDATE_PROJECT_PROJECT_KEY',
        "The key of the project (e.g., 'PROJECT')"
      )
    ),
  name: z
    .string()
    .optional()
    .describe(t('TOOL_UPDATE_PROJECT_NAME', 'Project name')),
  key: z
    .string()
    .optional()
    .describe(t('TOOL_UPDATE_PROJECT_KEY', 'Project key')),
  chartEnabled: z
    .boolean()
    .optional()
    .describe(
      t('TOOL_UPDATE_PROJECT_CHART_ENABLED', 'Whether to enable chart')
    ),
  subtaskingEnabled: z
    .boolean()
    .optional()
    .describe(
      t(
        'TOOL_UPDATE_PROJECT_SUBTASKING_ENABLED',
        'Whether to enable subtasking'
      )
    ),
  projectLeaderCanEditProjectLeader: z
    .boolean()
    .optional()
    .describe(
      t(
        'TOOL_UPDATE_PROJECT_LEADER_CAN_EDIT',
        'Whether project leaders can edit other project leaders'
      )
    ),
  textFormattingRule: z
    .enum(['backlog', 'markdown'])
    .optional()
    .describe(t('TOOL_UPDATE_PROJECT_TEXT_FORMATTING', 'Text formatting rule')),
  archived: z
    .boolean()
    .optional()
    .describe(
      t('TOOL_UPDATE_PROJECT_ARCHIVED', 'Whether to archive the project')
    ),
}));

export const updateProjectTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof updateProjectSchema>,
  Entity.Project.Project
> => {
  return {
    name: 'update_project',
    description: t(
      'TOOL_UPDATE_PROJECT_DESCRIPTION',
      'Updates an existing project'
    ),
    schema: z.object(updateProjectSchema(t)),
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
    handler: async ({ projectId, projectKey, ...param }) => {
      const result = resolveIdOrKey(
        'project',
        { id: projectId, key: projectKey },
        t
      );
      if (!result.ok) {
        throw result.error;
      }
      return backlog.patchProject(result.value, param);
    },
  };
};
