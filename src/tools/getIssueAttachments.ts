import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { IssueFileInfoSchema } from '../types/zod/backlogOutputDefinition.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';

const getIssueAttachmentsSchema = buildToolSchema((t) => ({
  issueId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_GET_ISSUE_ATTACHMENTS_ISSUE_ID',
        'The numeric ID of the issue (e.g., 12345)'
      )
    ),
  issueKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_GET_ISSUE_ATTACHMENTS_ISSUE_KEY',
        "The key of the issue (e.g., 'PROJ-123')"
      )
    ),
}));

export const getIssueAttachmentsTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof getIssueAttachmentsSchema>,
  (typeof IssueFileInfoSchema)['shape']
> => {
  return {
    name: 'get_issue_attachments',
    description: t(
      'TOOL_GET_ISSUE_ATTACHMENTS_DESCRIPTION',
      'Returns list of attachments for an issue'
    ),
    schema: z.object(getIssueAttachmentsSchema(t)),
    outputSchema: IssueFileInfoSchema,
    handler: async ({ issueId, issueKey }) => {
      const result = resolveIdOrKey('issue', { id: issueId, key: issueKey }, t);
      if (!result.ok) {
        throw result.error;
      }
      return backlog.getIssueAttachments(result.value);
    },
  };
};
