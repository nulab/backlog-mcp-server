import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';

const deleteIssueSchema = buildToolSchema((t) => ({
  issueId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_DELETE_ISSUE_ISSUE_ID',
        'The numeric ID of the issue (e.g., 12345)'
      )
    ),
  issueKey: z
    .string()
    .optional()
    .describe(
      t('TOOL_GET_ISSUE_ISSUE_KEY', "The key of the issue (e.g., 'PROJ-123')")
    ),
}));

export const deleteIssueTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<ReturnType<typeof deleteIssueSchema>, Entity.Issue.Issue> => {
  return {
    name: 'delete_issue',
    description: t('TOOL_DELETE_ISSUE_DESCRIPTION', 'Deletes an issue'),
    schema: z.object(deleteIssueSchema(t)),
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
    handler: async ({ issueId, issueKey }) => {
      const result = resolveIdOrKey('issue', { id: issueId, key: issueKey }, t);
      if (!result.ok) {
        throw result.error;
      }
      return backlog.deleteIssue(result.value);
    },
  };
};
