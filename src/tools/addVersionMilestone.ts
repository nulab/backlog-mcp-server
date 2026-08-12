import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';

const addVersionMilestoneSchema = buildToolSchema((t) => ({
  projectId: z
    .number()
    .optional()
    .describe(t('TOOL_ADD_VERSION_MILESTONE_PROJECT_ID', 'Project ID')),
  projectKey: z
    .string()
    .optional()
    .describe(t('TOOL_ADD_VERSION_MILESTONE_PROJECT_KEY', 'Project key')),
  name: z
    .string()
    .describe(t('TOOL_ADD_VERSION_MILESTONE_NAME', 'Version name')),
  description: z
    .string()
    .optional()
    .describe(
      t('TOOL_ADD_VERSION_MILESTONE_DESCRIPTION', 'Version description')
    ),
  startDate: z
    .string()
    .optional()
    .describe(
      t('TOOL_ADD_VERSION_MILESTONE_START_DATE', 'Start date of the version')
    ),
  releaseDueDate: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_ADD_VERSION_MILESTONE_RELEASE_DUE_DATE',
        'Release due date of the version'
      )
    ),
}));

export const addVersionMilestoneTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof addVersionMilestoneSchema>,
  Entity.Project.Version
> => {
  return {
    name: 'add_version_milestone',
    description: t(
      'TOOL_ADD_VERSION_MILESTONE_DESCRIPTION',
      'Creates a new version milestone'
    ),
    schema: z.object(addVersionMilestoneSchema(t)),
    returnsList: false,
    outputFields: outputFields<Entity.Project.Version>()([
      'id',
      'projectId',
      'name',
      'description',
      'startDate',
      'releaseDueDate',
      'archived',
      'displayOrder',
    ]),
    importantFields: [
      'id',
      'name',
      'description',
      'startDate',
      'releaseDueDate',
    ],
    handler: async ({ projectId, projectKey, ...params }) => {
      const result = resolveIdOrKey(
        'project',
        { id: projectId, key: projectKey },
        t
      );
      if (!result.ok) {
        throw result.error;
      }
      return backlog.postVersions(result.value, params);
    },
  };
};
