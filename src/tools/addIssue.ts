import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { z } from 'zod';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
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
          .union([
            z.string(),
            z.number(),
            z.array(z.string()),
            z.array(z.number()),
          ])
          .optional()
          .describe(
            t(
              'TOOL_ADD_ISSUE_CUSTOM_FIELD_VALUE',
              'Value of the custom field. For text/date fields, provide a string. For numeric fields, provide a number. For list fields, provide an array of strings or numbers.'
            )
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
  { t }: DescriptionHelper
): ToolDefinition<ReturnType<typeof addIssueSchema>, Entity.Issue.Issue> => {
  return {
    name: 'add_issue',
    description: t(
      'TOOL_ADD_ISSUE_DESCRIPTION',
      'Creates a new issue in the specified project.'
    ),
    schema: z.object(addIssueSchema(t)),
    returnsList: false,
    outputFields: outputFields<Entity.Issue.Issue>()([
      'id',
      'projectId',
      'issueKey',
      'keyId',
      'issueType',
      'summary',
      'description',
      'resolution',
      'priority',
      'status',
      'assignee',
      'category',
      'versions',
      'milestone',
      'startDate',
      'dueDate',
      'estimatedHours',
      'actualHours',
      'parentIssueId',
      'createdUser',
      'created',
      'updatedUser',
      'updated',
      'customFields',
      'attachments',
      'sharedFiles',
      'stars',
      'childIssueSummary',
    ]),
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
