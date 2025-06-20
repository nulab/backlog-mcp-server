import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { IssueSchema } from '../types/zod/backlogOutputDefinition.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';
import { customFieldsToPayload } from '../backlog/customFields.js';

const updateIssueSchema = buildToolSchema((t) => ({
  issueId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_UPDATE_ISSUE_ISSUE_ID',
        'The numeric ID of the issue (e.g., 12345)'
      )
    ),
  issueKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_UPDATE_ISSUE_ISSUE_KEY',
        "The key of the issue (e.g., 'PROJ-123')"
      )
    ),
  summary: z
    .string()
    .optional()
    .describe(t('TOOL_UPDATE_ISSUE_SUMMARY', 'Summary of the issue')),
  issueTypeId: z
    .number()
    .optional()
    .describe(t('TOOL_UPDATE_ISSUE_ISSUE_TYPE_ID', 'Issue type ID')),
  priorityId: z
    .number()
    .optional()
    .describe(t('TOOL_UPDATE_ISSUE_PRIORITY_ID', 'Priority ID')),
  description: z
    .string()
    .optional()
    .describe(
      t('TOOL_UPDATE_ISSUE_DESCRIPTION', 'Detailed description of the issue')
    ),
  startDate: z
    .string()
    .optional()
    .describe(
      t('TOOL_UPDATE_ISSUE_START_DATE', 'Scheduled start date (yyyy-MM-dd)')
    ),
  dueDate: z
    .string()
    .optional()
    .describe(
      t('TOOL_UPDATE_ISSUE_DUE_DATE', 'Scheduled due date (yyyy-MM-dd)')
    ),
  estimatedHours: z
    .number()
    .optional()
    .describe(t('TOOL_UPDATE_ISSUE_ESTIMATED_HOURS', 'Estimated work hours')),
  actualHours: z
    .number()
    .optional()
    .describe(t('TOOL_UPDATE_ISSUE_ACTUAL_HOURS', 'Actual work hours')),
  categoryId: z
    .array(z.number())
    .optional()
    .describe(t('TOOL_UPDATE_ISSUE_CATEGORY_ID', 'Category IDs')),
  versionId: z
    .array(z.number())
    .optional()
    .describe(t('TOOL_UPDATE_ISSUE_VERSION_ID', 'Version IDs')),
  milestoneId: z
    .array(z.number())
    .optional()
    .describe(t('TOOL_UPDATE_ISSUE_MILESTONE_ID', 'Milestone IDs')),
  statusId: z
    .number()
    .optional()
    .describe(t('TOOL_UPDATE_ISSUE_STATUS_ID', 'Status ID')),
  resolutionId: z
    .number()
    .optional()
    .describe(t('TOOL_UPDATE_ISSUE_RESOLUTION_ID', 'Resolution ID')),
  assigneeId: z
    .number()
    .optional()
    .describe(t('TOOL_UPDATE_ISSUE_ASSIGNEE_ID', 'User ID of the assignee')),
  notifiedUserId: z
    .array(z.number())
    .optional()
    .describe(t('TOOL_UPDATE_ISSUE_NOTIFIED_USER_ID', 'User IDs to notify')),
  attachmentId: z
    .array(z.number())
    .optional()
    .describe(t('TOOL_UPDATE_ISSUE_ATTACHMENT_ID', 'Attachment IDs')),
  comment: z
    .string()
    .optional()
    .describe(
      t('TOOL_UPDATE_ISSUE_COMMENT', 'Comment to add when updating the issue')
    ),
  customFields: z
    .array(
      z.object({
        id: z
          .number()
          .describe(
            t(
              'TOOL_UPDATE_ISSUE_CUSTOM_FIELD_ID',
              'The ID of the custom field (e.g., 12345)'
            )
          ),
        value: z.union([z.string().max(255), z.number(), z.array(z.string())]),
        otherValue: z
          .string()
          .optional()
          .describe(
            t(
              'TOOL_UPDATE_ISSUE_CUSTOM_FIELD_OTHER_VALUE',
              'Other value for list type fields'
            )
          ),
      })
    )
    .optional()
    .describe(
      t(
        'TOOL_UPDATE_ISSUE_CUSTOM_FIELDS',
        'List of custom fields to set on the issue'
      )
    ),
}));

export const updateIssueTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof updateIssueSchema>,
  (typeof IssueSchema)['shape']
> => {
  return {
    name: 'update_issue',
    description: t(
      'TOOL_UPDATE_ISSUE_DESCRIPTION',
      'Updates an existing issue'
    ),
    schema: z.object(updateIssueSchema(t)),
    outputSchema: IssueSchema,
    handler: async ({ issueId, issueKey, customFields, ...params }) => {
      const result = resolveIdOrKey('issue', { id: issueId, key: issueKey }, t);
      if (!result.ok) {
        throw result.error;
      }
      const customFieldPayload = customFieldsToPayload(customFields);

      const finalPayload = {
        ...params,
        ...customFieldPayload,
      };
      return backlog.patchIssue(result.value, finalPayload);
    },
  };
};
