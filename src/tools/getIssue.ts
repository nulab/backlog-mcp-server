import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';

const getIssueSchema = buildToolSchema((t) => ({
  issueId: z
    .number()
    .optional()
    .describe(
      t('TOOL_GET_ISSUE_ISSUE_ID', 'The numeric ID of the issue (e.g., 12345)')
    ),
  issueKey: z
    .string()
    .optional()
    .describe(
      t('TOOL_GET_ISSUE_ISSUE_KEY', "The key of the issue (e.g., 'PROJ-123')")
    ),
}));

export const getIssueTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<ReturnType<typeof getIssueSchema>, Entity.Issue.Issue> => {
  return {
    name: 'get_issue',
    description: t(
      'TOOL_GET_ISSUE_DESCRIPTION',
      'Returns information about a specific issue'
    ),
    returnsList: false,
    outputFields: outputFields<Entity.Issue.Issue>()([
      'id',
      'projectId',
      'issueKey',
      'keyId',
      'issueType',
      'summary',
      'description',
      'resolution',
      'priority',
      'status',
      'assignee',
      'category',
      'versions',
      'milestone',
      'startDate',
      'dueDate',
      'estimatedHours',
      'actualHours',
      'parentIssueId',
      'createdUser',
      'created',
      'updatedUser',
      'updated',
      'customFields',
      'attachments',
      'sharedFiles',
      'stars',
      'childIssueSummary',
    ]),
    schema: z.object(getIssueSchema(t)),
    handler: async ({ issueId, issueKey }) => {
      const result = resolveIdOrKey('issue', { id: issueId, key: issueKey }, t);
      if (!result.ok) {
        throw result.error;
      }
      return backlog.getIssue(result.value);
    },
  };
};
