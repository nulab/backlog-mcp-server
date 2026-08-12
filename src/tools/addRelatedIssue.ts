import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';

const addRelatedIssueSchema = buildToolSchema((t) => ({
  issueId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_ADD_RELATED_ISSUE_ISSUE_ID',
        'The numeric ID of the issue (e.g., 12345)'
      )
    ),
  issueKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_ADD_RELATED_ISSUE_ISSUE_KEY',
        "The key of the issue (e.g., 'PROJ-123')"
      )
    ),
  targetIssueId: z
    .number()
    .describe(
      t(
        'TOOL_ADD_RELATED_ISSUE_TARGET_ISSUE_ID',
        'The numeric ID of the issue to relate to (e.g., 12346)'
      )
    ),
}));

export const addRelatedIssueTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof addRelatedIssueSchema>,
  Entity.Issue.RelatedIssue
> => {
  return {
    name: 'add_related_issue',
    description: t(
      'TOOL_ADD_RELATED_ISSUE_DESCRIPTION',
      'Relates an issue to another issue'
    ),
    schema: z.object(addRelatedIssueSchema(t)),
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
    handler: async ({ issueId, issueKey, targetIssueId }) => {
      const result = resolveIdOrKey('issue', { id: issueId, key: issueKey }, t);
      if (!result.ok) {
        throw result.error;
      }
      return backlog.addRelatedIssue(result.value, { targetIssueId });
    },
  };
};
