import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';

const removeRelatedIssueSchema = buildToolSchema((t) => ({
  issueId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_REMOVE_RELATED_ISSUE_ISSUE_ID',
        'The numeric ID of the issue (e.g., 12345)'
      )
    ),
  issueKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_REMOVE_RELATED_ISSUE_ISSUE_KEY',
        "The key of the issue (e.g., 'PROJ-123')"
      )
    ),
  relatedIssueId: z
    .number()
    .describe(
      t(
        'TOOL_REMOVE_RELATED_ISSUE_RELATED_ISSUE_ID',
        'The numeric ID of the related issue to unlink (e.g., 12346)'
      )
    ),
}));

export const removeRelatedIssueTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof removeRelatedIssueSchema>,
  Entity.Issue.RelatedIssue
> => {
  return {
    name: 'remove_related_issue',
    description: t(
      'TOOL_REMOVE_RELATED_ISSUE_DESCRIPTION',
      'Removes the relation between an issue and a related issue'
    ),
    schema: z.object(removeRelatedIssueSchema(t)),
    returnsList: false,
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
    handler: async ({ issueId, issueKey, relatedIssueId }) => {
      const result = resolveIdOrKey('issue', { id: issueId, key: issueKey }, t);
      if (!result.ok) {
        throw result.error;
      }
      return backlog.removeRelatedIssue(result.value, relatedIssueId);
    },
  };
};
