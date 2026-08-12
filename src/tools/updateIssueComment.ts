import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';

const updateIssueCommentSchema = buildToolSchema((t) => ({
  issueId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_UPDATE_ISSUE_COMMENT_ISSUE_ID',
        'The numeric ID of the issue (e.g., 12345)'
      )
    ),
  issueKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_UPDATE_ISSUE_COMMENT_ISSUE_KEY',
        "The key of the issue (e.g., 'PROJ-123')"
      )
    ),
  commentId: z
    .number()
    .describe(t('TOOL_UPDATE_ISSUE_COMMENT_COMMENT_ID', 'Comment ID')),
  content: z
    .string()
    .describe(t('TOOL_UPDATE_ISSUE_COMMENT_CONTENT', 'Comment content')),
}));

export const updateIssueCommentTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof updateIssueCommentSchema>,
  Entity.Issue.Comment
> => {
  return {
    name: 'update_issue_comment',
    description: t(
      'TOOL_UPDATE_ISSUE_COMMENT_DESCRIPTION',
      'Updates a comment on an issue'
    ),
    schema: z.object(updateIssueCommentSchema(t)),
    returnsList: false,
    outputFields: outputFields<Entity.Issue.Comment>()([
      'id',
      'projectId',
      'issueId',
      'content',
      'changeLog',
      'createdUser',
      'created',
      'updated',
      'stars',
      'notifications',
    ]),
    importantFields: ['id', 'content', 'createdUser', 'updated'],
    handler: async ({ issueId, issueKey, commentId, content }) => {
      const result = resolveIdOrKey('issue', { id: issueId, key: issueKey }, t);
      if (!result.ok) {
        throw result.error;
      }
      return backlog.patchIssueComment(result.value, commentId, { content });
    },
  };
};
