import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { RelatedIssueSchema } from '../types/zod/backlogOutputDefinition.js';
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
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof getRelatedIssuesSchema>,
  (typeof RelatedIssueSchema)['shape']
> => {
  return {
    name: 'get_related_issues',
    description: t(
      'TOOL_GET_RELATED_ISSUES_DESCRIPTION',
      'Returns list of issues related to a specific issue'
    ),
    schema: z.object(getRelatedIssuesSchema(t)),
    importantFields: ['issueKey', 'summary', 'status', 'type'],
    outputSchema: RelatedIssueSchema,
    handler: async ({ issueId, issueKey }) => {
      const result = resolveIdOrKey('issue', { id: issueId, key: issueKey }, t);
      if (!result.ok) {
        throw result.error;
      }
      return backlog.getRelatedIssues(result.value);
    },
  };
};
