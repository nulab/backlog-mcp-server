import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { IssueCommentSchema } from '../types/zod/backlogOutputDefinition.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';

const addIssueCommentSchema = buildToolSchema((t) => ({
  issueId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_ADD_ISSUE_COMMENT_ID',
        'The numeric ID of the issue (e.g., 12345)'
      )
    ),
  issueKey: z
    .string()
    .optional()
    .describe(
      t('TOOL_ADD_ISSUE_COMMENT_KEY', "The key of the issue (e.g., 'PROJ-123')")
    ),
  content: z
    .string()
    .describe(t('TOOL_ADD_ISSUE_COMMENT_CONTENT', 'Comment content')),
  notifiedUserId: z
    .array(z.number())
    .optional()
    .describe(
      t('TOOL_ADD_ISSUE_COMMENT_NOTIFIED_USER_ID', 'User IDs to notify')
    ),
  attachmentId: z
    .array(z.number())
    .optional()
    .describe(t('TOOL_ADD_ISSUE_COMMENT_ATTACHMENT_ID', 'Attachment IDs')),
}));

export const addIssueCommentTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof addIssueCommentSchema>,
  (typeof IssueCommentSchema)['shape']
> => {
  return {
    name: 'add_issue_comment',
    description: t(
      'TOOL_ADD_ISSUE_COMMENT_DESCRIPTION',
      'Adds a comment to an issue'
    ),
    schema: z.object(addIssueCommentSchema(t)),
    outputSchema: IssueCommentSchema,
    handler: async ({
      issueId,
      issueKey,
      content,
      notifiedUserId,
      attachmentId,
    }) => {
      const result = resolveIdOrKey('issue', { id: issueId, key: issueKey }, t);
      if (!result.ok) {
        throw result.error;
      }
      return backlog.postIssueComments(result.value, {
        content,
        notifiedUserId,
        attachmentId,
      });
    },
  };
};
