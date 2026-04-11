import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { IssueCountSchema } from '../types/zod/backlogOutputDefinition.js';
import { customFieldFiltersToPayload } from '../backlog/customFields.js';
import { buildCustomFieldFilterSchema } from './shared/customFieldFiltersSchema.js';

const countIssuesSchema = buildToolSchema((t) => ({
  projectId: z
    .array(z.number())
    .optional()
    .describe(t('TOOL_COUNT_ISSUES_PROJECT_ID', 'Project IDs')),
  issueTypeId: z
    .array(z.number())
    .optional()
    .describe(t('TOOL_COUNT_ISSUES_ISSUE_TYPE_ID', 'Issue type IDs')),
  categoryId: z
    .array(z.number())
    .optional()
    .describe(t('TOOL_COUNT_ISSUES_CATEGORY_ID', 'Category IDs')),
  versionId: z
    .array(z.number())
    .optional()
    .describe(t('TOOL_COUNT_ISSUES_VERSION_ID', 'Version IDs')),
  milestoneId: z
    .array(z.number())
    .optional()
    .describe(t('TOOL_COUNT_ISSUES_MILESTONE_ID', 'Milestone IDs')),
  statusId: z
    .array(z.number())
    .optional()
    .describe(t('TOOL_COUNT_ISSUES_STATUS_ID', 'Status IDs')),
  priorityId: z
    .array(z.number())
    .optional()
    .describe(t('TOOL_COUNT_ISSUES_PRIORITY_ID', 'Priority IDs')),
  assigneeId: z
    .array(z.number())
    .optional()
    .describe(t('TOOL_COUNT_ISSUES_ASSIGNEE_ID', 'Assignee user IDs')),
  createdUserId: z
    .array(z.number())
    .optional()
    .describe(t('TOOL_COUNT_ISSUES_CREATED_USER_ID', 'Created user IDs')),
  resolutionId: z
    .array(z.number())
    .optional()
    .describe(t('TOOL_COUNT_ISSUES_RESOLUTION_ID', 'Resolution IDs')),
  parentIssueId: z
    .array(z.number())
    .optional()
    .describe(t('TOOL_COUNT_ISSUES_PARENT_ISSUE_ID', 'Parent issue IDs')),
  keyword: z
    .string()
    .optional()
    .describe(
      t('TOOL_COUNT_ISSUES_KEYWORD', 'Keyword to search for in issues')
    ),
  startDateSince: z
    .string()
    .optional()
    .describe(
      t('TOOL_COUNT_ISSUES_START_DATE_SINCE', 'Start date since (yyyy-MM-dd)')
    ),
  startDateUntil: z
    .string()
    .optional()
    .describe(
      t('TOOL_COUNT_ISSUES_START_DATE_UNTIL', 'Start date until (yyyy-MM-dd)')
    ),
  dueDateSince: z
    .string()
    .optional()
    .describe(
      t('TOOL_COUNT_ISSUES_DUE_DATE_SINCE', 'Due date since (yyyy-MM-dd)')
    ),
  dueDateUntil: z
    .string()
    .optional()
    .describe(
      t('TOOL_COUNT_ISSUES_DUE_DATE_UNTIL', 'Due date until (yyyy-MM-dd)')
    ),
  createdSince: z
    .string()
    .optional()
    .describe(
      t('TOOL_COUNT_ISSUES_CREATED_SINCE', 'Created since (yyyy-MM-dd)')
    ),
  createdUntil: z
    .string()
    .optional()
    .describe(
      t('TOOL_COUNT_ISSUES_CREATED_UNTIL', 'Created until (yyyy-MM-dd)')
    ),
  updatedSince: z
    .string()
    .optional()
    .describe(
      t('TOOL_COUNT_ISSUES_UPDATED_SINCE', 'Updated since (yyyy-MM-dd)')
    ),
  updatedUntil: z
    .string()
    .optional()
    .describe(
      t('TOOL_COUNT_ISSUES_UPDATED_UNTIL', 'Updated until (yyyy-MM-dd)')
    ),
  customFields: z
    .array(buildCustomFieldFilterSchema(t))
    .optional()
    .describe(
      t(
        'TOOL_COUNT_ISSUES_CUSTOM_FIELDS',
        'Custom field filters (text, numeric, date, or list)'
      )
    ),
}));

export const countIssuesTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof countIssuesSchema>,
  (typeof IssueCountSchema)['shape']
> => {
  return {
    name: 'count_issues',
    description: t('TOOL_COUNT_ISSUES_DESCRIPTION', 'Returns count of issues'),
    schema: z.object(countIssuesSchema(t)),
    outputSchema: IssueCountSchema,
    handler: async ({ customFields, ...rest }) => {
      return backlog.getIssuesCount({
        ...rest,
        ...customFieldFiltersToPayload(customFields),
      });
    },
  };
};
