import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { IssueCommentSchema } from '../types/zod/backlogOutputDefinition.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';

const deleteIssueCommentSchema = buildToolSchema((t) => ({
  issueId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_DELETE_ISSUE_COMMENT_ISSUE_ID',
        'The numeric ID of the issue (e.g., 12345)'
      )
    ),
  issueKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_DELETE_ISSUE_COMMENT_ISSUE_KEY',
        "The key of the issue (e.g., 'PROJ-123')"
      )
    ),
  commentId: z
    .number()
    .describe(
      t('TOOL_DELETE_ISSUE_COMMENT_COMMENT_ID', 'The ID of the comment')
    ),
}));

export const deleteIssueCommentTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof deleteIssueCommentSchema>,
  (typeof IssueCommentSchema)['shape']
> => {
  return {
    name: 'delete_issue_comment',
    description: t(
      'TOOL_DELETE_ISSUE_COMMENT_DESCRIPTION',
      'Deletes a comment from an issue'
    ),
    schema: z.object(deleteIssueCommentSchema(t)),
    outputSchema: IssueCommentSchema,
    handler: async ({ issueId, issueKey, commentId }) => {
      const result = resolveIdOrKey('issue', { id: issueId, key: issueKey }, t);
      if (!result.ok) {
        throw result.error;
      }
      return backlog.deleteIssueComment(result.value, commentId);
    },
  };
};
