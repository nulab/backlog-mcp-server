import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { ProjectSchema } from '../types/zod/backlogOutputDefinition.js';
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
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof updateProjectSchema>,
  (typeof ProjectSchema)['shape']
> => {
  return {
    name: 'update_project',
    description: t(
      'TOOL_UPDATE_PROJECT_DESCRIPTION',
      'Updates an existing project'
    ),
    schema: z.object(updateProjectSchema(t)),
    outputSchema: ProjectSchema,
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
