import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { IssueCommentSchema } from '../types/zod/backlogOutputDefinition.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';

const getIssueCommentsSchema = buildToolSchema((t) => ({
  issueId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_GET_ISSUE_COMMENTS_ISSUE_ID',
        'The numeric ID of the issue (e.g., 12345)'
      )
    ),
  issueKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_GET_ISSUE_COMMENTS_ISSUE_KEY',
        "The key of the issue (e.g., 'PROJ-123')"
      )
    ),
  minId: z
    .number()
    .optional()
    .describe(t('TOOL_GET_ISSUE_COMMENTS_MIN_ID', 'Minimum comment ID')),
  maxId: z
    .number()
    .optional()
    .describe(t('TOOL_GET_ISSUE_COMMENTS_MAX_ID', 'Maximum comment ID')),
  count: z
    .number()
    .optional()
    .describe(
      t('TOOL_GET_ISSUE_COMMENTS_COUNT', 'Number of comments to retrieve')
    ),
  order: z
    .enum(['asc', 'desc'])
    .optional()
    .describe(t('TOOL_GET_ISSUE_COMMENTS_ORDER', 'Sort order')),
}));

export const getIssueCommentsTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof getIssueCommentsSchema>,
  (typeof IssueCommentSchema)['shape']
> => {
  return {
    name: 'get_issue_comments',
    description: t(
      'TOOL_GET_ISSUE_COMMENTS_DESCRIPTION',
      'Returns list of comments for an issue'
    ),
    schema: z.object(getIssueCommentsSchema(t)),
    outputSchema: IssueCommentSchema,
    handler: async ({ issueId, issueKey, ...params }) => {
      const result = resolveIdOrKey('issue', { id: issueId, key: issueKey }, t);
      if (!result.ok) {
        throw result.error;
      }
      return backlog.getIssueComments(result.value, params);
    },
  };
};
