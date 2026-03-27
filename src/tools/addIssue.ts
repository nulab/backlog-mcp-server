import { Backlog } from 'backlog-js';
import { z } from 'zod';
import { TranslationHelper } from '../createTranslationHelper.js';
import { IssueSchema } from '../types/zod/backlogOutputDefinition.js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { customFieldsToPayload } from '../backlog/customFields.js';

const addIssueSchema = buildToolSchema((t) => ({
  projectId: z.number().describe(t('TOOL_ADD_ISSUE_PROJECT_ID', 'Project ID')),
  summary: z
    .string()
    .describe(t('TOOL_ADD_ISSUE_SUMMARY', 'Summary of the issue')),
  issueTypeId: z
    .number()
    .describe(t('TOOL_ADD_ISSUE_ISSUE_TYPE_ID', 'Issue type ID')),
  priorityId: z
    .number()
    .describe(t('TOOL_ADD_ISSUE_PRIORITY_ID', 'Priority ID')),
  description: z
    .string()
    .optional()
    .describe(
      t('TOOL_ADD_ISSUE_DESCRIPTION', 'Detailed description of the issue')
    ),
  startDate: z
    .string()
    .optional()
    .describe(
      t('TOOL_ADD_ISSUE_START_DATE', 'Scheduled start date (yyyy-MM-dd)')
    ),
  dueDate: z
    .string()
    .optional()
    .describe(t('TOOL_ADD_ISSUE_DUE_DATE', 'Scheduled due date (yyyy-MM-dd)')),
  estimatedHours: z
    .number()
    .optional()
    .describe(t('TOOL_ADD_ISSUE_ESTIMATED_HOURS', 'Estimated work hours')),
  actualHours: z
    .number()
    .optional()
    .describe(t('TOOL_ADD_ISSUE_ACTUAL_HOURS', 'Actual work hours')),
  categoryId: z
    .array(z.number())
    .optional()
    .describe(t('TOOL_ADD_ISSUE_CATEGORY_ID', 'Category IDs')),
  versionId: z
    .array(z.number())
    .optional()
    .describe(t('TOOL_ADD_ISSUE_VERSION_ID', 'Version IDs')),
  milestoneId: z
    .array(z.number())
    .optional()
    .describe(t('TOOL_ADD_ISSUE_MILESTONE_ID', 'Milestone IDs')),
  assigneeId: z
    .number()
    .optional()
    .describe(t('TOOL_ADD_ISSUE_ASSIGNEE_ID', 'User ID of the assignee')),
  notifiedUserId: z
    .array(z.number())
    .optional()
    .describe(t('TOOL_ADD_ISSUE_NOTIFIED_USER_ID', 'User IDs to notify')),
  attachmentId: z
    .array(z.number())
    .optional()
    .describe(t('TOOL_ADD_ISSUE_ATTACHMENT_ID', 'Attachment IDs')),
  parentIssueId: z
    .number()
    .optional()
    .describe(t('TOOL_ADD_ISSUE_PARENT_ISSUE_ID', 'Parent issue ID')),
  customFields: z
    .array(
      z.object({
        id: z
          .number()
          .describe(
            t(
              'TOOL_ADD_ISSUE_CUSTOM_FIELD_ID',
              'The ID of the custom field (e.g., 12345)'
            )
          ),
        value: z
          .union([z.number(), z.array(z.number())])
          .optional()
          .describe(
            'The ID(s) of the custom field item. For single-select fields, provide a number. For multi-select fields, provide an array of numbers representing the selected item IDs.'
          ),
        otherValue: z
          .string()
          .optional()
          .describe(
            t(
              'TOOL_ADD_ISSUE_CUSTOM_FIELD_OTHER_VALUE',
              'Other value for list type fields'
            )
          ),
      })
    )
    .optional()
    .describe(
      t(
        'TOOL_ADD_ISSUE_CUSTOM_FIELDS',
        'List of custom fields to set on the issue'
      )
    ),
}));

export const addIssueTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof addIssueSchema>,
  (typeof IssueSchema)['shape']
> => {
  return {
    name: 'add_issue',
    description: t(
      'TOOL_ADD_ISSUE_DESCRIPTION',
      'Creates a new issue in the specified project.'
    ),
    schema: z.object(addIssueSchema(t)),
    outputSchema: IssueSchema,
    importantFields: ['summary', 'issueKey', 'description', 'createdUser'],
    handler: async ({ customFields, ...params }) => {
      const customFieldPayload = customFieldsToPayload(customFields);

      const finalPayload = {
        ...params,
        ...customFieldPayload,
      };

      return backlog.postIssue(finalPayload);
    },
  };
};
