import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';

const getIssueTypesSchema = buildToolSchema((t) => ({
  projectId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_GET_GIT_REPOSITORIES_PROJECT_ID',
        'The numeric ID of the project (e.g., 12345)'
      )
    ),
  projectKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_GET_GIT_REPOSITORIES_PROJECT_KEY',
        "The key of the project (e.g., 'PROJECT')"
      )
    ),
}));

export const getIssueTypesTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof getIssueTypesSchema>,
  Entity.Issue.IssueType
> => {
  return {
    name: 'get_issue_types',
    description: t(
      'TOOL_GET_ISSUE_TYPES_DESCRIPTION',
      'Returns list of issue types for a project'
    ),
    schema: z.object(getIssueTypesSchema(t)),
    returnsList: true,
    outputFields: outputFields<Entity.Issue.IssueType>()([
      'id',
      'projectId',
      'name',
      'color',
      'displayOrder',
      'templateSummary',
      'templateDescription',
    ]),
    importantFields: ['id', 'name'],
    handler: async ({ projectId, projectKey }) => {
      const result = resolveIdOrKey(
        'project',
        { id: projectId, key: projectKey },
        t
      );
      if (!result.ok) {
        throw result.error;
      }
      return backlog.getIssueTypes(result.value);
    },
  };
};
