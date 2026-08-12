import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';

const addProjectSchema = buildToolSchema((t) => ({
  name: z.string().describe(t('TOOL_ADD_PROJECT_NAME', 'Project name')),
  key: z.string().describe(t('TOOL_ADD_PROJECT_KEY', 'Project key')),
  chartEnabled: z
    .boolean()
    .optional()
    .describe(
      t(
        'TOOL_ADD_PROJECT_CHART_ENABLED',
        'Whether to enable chart (default: false)'
      )
    ),
  subtaskingEnabled: z
    .boolean()
    .optional()
    .describe(
      t(
        'TOOL_ADD_PROJECT_SUBTASKING_ENABLED',
        'Whether to enable subtasking (default: false)'
      )
    ),
  projectLeaderCanEditProjectLeader: z
    .boolean()
    .optional()
    .describe(
      t(
        'TOOL_ADD_PROJECT_LEADER_CAN_EDIT',
        'Whether project leaders can edit other project leaders (default: false)'
      )
    ),
  textFormattingRule: z
    .enum(['backlog', 'markdown'])
    .optional()
    .describe(
      t(
        'TOOL_ADD_PROJECT_TEXT_FORMATTING',
        "Text formatting rule (default: 'backlog')"
      )
    ),
}));

export const addProjectTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof addProjectSchema>,
  Entity.Project.Project
> => {
  return {
    name: 'add_project',
    description: t('TOOL_ADD_PROJECT_DESCRIPTION', 'Creates a new project'),
    schema: z.object(addProjectSchema(t)),
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
    handler: async ({
      name,
      key,
      chartEnabled,
      subtaskingEnabled,
      projectLeaderCanEditProjectLeader,
      textFormattingRule,
    }) =>
      backlog.postProject({
        name,
        key,
        chartEnabled: chartEnabled ?? false,
        subtaskingEnabled: subtaskingEnabled ?? false,
        projectLeaderCanEditProjectLeader:
          projectLeaderCanEditProjectLeader ?? false,
        textFormattingRule: textFormattingRule ?? 'backlog',
      }),
  };
};
