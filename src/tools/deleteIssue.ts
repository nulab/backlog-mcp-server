import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { IssueSchema } from '../types/zod/backlogOutputDefinition.js';
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
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof deleteIssueSchema>,
  (typeof IssueSchema)['shape']
> => {
  return {
    name: 'delete_issue',
    description: t('TOOL_DELETE_ISSUE_DESCRIPTION', 'Deletes an issue'),
    schema: z.object(deleteIssueSchema(t)),
    outputSchema: IssueSchema,
    handler: async ({ issueId, issueKey }) => {
      const result = resolveIdOrKey('issue', { id: issueId, key: issueKey }, t);
      if (!result.ok) {
        throw result.error;
      }
      return backlog.deleteIssue(result.value);
    },
  };
};
