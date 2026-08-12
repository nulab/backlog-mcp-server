import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';

const getRelatedIssuesSchema = buildToolSchema((t) => ({
  issueId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_GET_RELATED_ISSUES_ISSUE_ID',
        'The numeric ID of the issue (e.g., 12345)'
      )
    ),
  issueKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_GET_RELATED_ISSUES_ISSUE_KEY',
        "The key of the issue (e.g., 'PROJ-123')"
      )
    ),
}));

export const getRelatedIssuesTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof getRelatedIssuesSchema>,
  Entity.Issue.RelatedIssue
> => {
  return {
    name: 'get_related_issues',
    description: t(
      'TOOL_GET_RELATED_ISSUES_DESCRIPTION',
      'Returns list of issues related to a specific issue'
    ),
    schema: z.object(getRelatedIssuesSchema(t)),
    importantFields: ['issueKey', 'summary', 'status', 'type'],
    returnsList: true,
    outputFields: outputFields<Entity.Issue.RelatedIssue>()([
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
      'type',
    ]),
    handler: async ({ issueId, issueKey }) => {
      const result = resolveIdOrKey('issue', { id: issueId, key: issueKey }, t);
      if (!result.ok) {
        throw result.error;
      }
      return backlog.getRelatedIssues(result.value);
    },
  };
};
