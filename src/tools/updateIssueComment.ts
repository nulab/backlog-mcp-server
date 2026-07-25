import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { IssueCommentSchema } from '../types/zod/backlogOutputDefinition.js';
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
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof updateIssueCommentSchema>,
  (typeof IssueCommentSchema)['shape']
> => {
  return {
    name: 'update_issue_comment',
    description: t(
      'TOOL_UPDATE_ISSUE_COMMENT_DESCRIPTION',
      'Updates a comment on an issue'
    ),
    schema: z.object(updateIssueCommentSchema(t)),
    outputSchema: IssueCommentSchema,
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
