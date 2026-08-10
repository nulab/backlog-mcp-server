import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { RelatedIssueSchema } from '../types/zod/backlogOutputDefinition.js';
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
  (typeof RelatedIssueSchema)['shape']
> => {
  return {
    name: 'add_related_issue',
    description: t(
      'TOOL_ADD_RELATED_ISSUE_DESCRIPTION',
      'Relates an issue to another issue'
    ),
    schema: z.object(addRelatedIssueSchema(t)),
    outputSchema: RelatedIssueSchema,
    handler: async ({ issueId, issueKey, targetIssueId }) => {
      const result = resolveIdOrKey('issue', { id: issueId, key: issueKey }, t);
      if (!result.ok) {
        throw result.error;
      }
      return backlog.addRelatedIssue(result.value, { targetIssueId });
    },
  };
};
