import { z } from "zod";
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from "../createTranslationHelper.js";
import { IssueSchema } from "../types/zod/backlogOutputDefinition.js";
import { customFieldsToPayload } from "../backlog/customFields.js";

const getIssuesSchema = buildToolSchema(t => ({
  projectId: z.array(z.number()).optional().describe(t("TOOL_GET_ISSUES_PROJECT_ID", "Project IDs")),
  issueTypeId: z.array(z.number()).optional().describe(t("TOOL_GET_ISSUES_ISSUE_TYPE_ID", "Issue type IDs")),
  categoryId: z.array(z.number()).optional().describe(t("TOOL_GET_ISSUES_CATEGORY_ID", "Category IDs")),
  versionId: z.array(z.number()).optional().describe(t("TOOL_GET_ISSUES_VERSION_ID", "Version IDs")),
  milestoneId: z.array(z.number()).optional().describe(t("TOOL_GET_ISSUES_MILESTONE_ID", "Milestone IDs")),
  statusId: z.array(z.number()).optional().describe(t("TOOL_GET_ISSUES_STATUS_ID", "Status IDs")),
  priorityId: z.array(z.number()).optional().describe(t("TOOL_GET_ISSUES_PRIORITY_ID", "Priority IDs")),
  assigneeId: z.array(z.number()).optional().describe(t("TOOL_GET_ISSUES_ASSIGNEE_ID", "Assignee user IDs")),
  createdUserId: z.array(z.number()).optional().describe(t("TOOL_GET_ISSUES_CREATED_USER_ID", "Created user IDs")),
  resolutionId: z.array(z.number()).optional().describe(t("TOOL_GET_ISSUES_RESOLUTION_ID", "Resolution IDs")),
  parentIssueId: z.array(z.number()).optional().describe(t("TOOL_GET_ISSUES_PARENT_ISSUE_ID", "Parent issue IDs")),
  keyword: z.string().optional().describe(t("TOOL_GET_ISSUES_KEYWORD", "Keyword to search for in issues")),
  startDateSince: z.string().optional().describe(t("TOOL_GET_ISSUES_START_DATE_SINCE", "Start date since (yyyy-MM-dd)")),
  startDateUntil: z.string().optional().describe(t("TOOL_GET_ISSUES_START_DATE_UNTIL", "Start date until (yyyy-MM-dd)")),
  dueDateSince: z.string().optional().describe(t("TOOL_GET_ISSUES_DUE_DATE_SINCE", "Due date since (yyyy-MM-dd)")),
  dueDateUntil: z.string().optional().describe(t("TOOL_GET_ISSUES_DUE_DATE_UNTIL", "Due date until (yyyy-MM-dd)")),
  createdSince: z.string().optional().describe(t("TOOL_GET_ISSUES_CREATED_SINCE", "Created since (yyyy-MM-dd)")),
  createdUntil: z.string().optional().describe(t("TOOL_GET_ISSUES_CREATED_UNTIL", "Created until (yyyy-MM-dd)")),
  updatedSince: z.string().optional().describe(t("TOOL_GET_ISSUES_UPDATED_SINCE", "Updated since (yyyy-MM-dd)")),
  updatedUntil: z.string().optional().describe(t("TOOL_GET_ISSUES_UPDATED_UNTIL", "Updated until (yyyy-MM-dd)")),
  sort: z.enum(["issueType", "category", "version", "milestone", "summary", "status", "priority", "attachment", "sharedFile", "created", "createdUser", "updated", "updatedUser", "assignee", "startDate", "dueDate", "estimatedHours", "actualHours", "childIssue"]).optional().describe(t("TOOL_GET_ISSUES_SORT", "Sort field")),
  order: z.enum(["asc", "desc"]).optional().describe(t("TOOL_GET_ISSUES_ORDER", "Sort order")),
  offset: z.number().optional().describe(t("TOOL_GET_ISSUES_OFFSET", "Offset for pagination")),
  count: z.number().optional().describe(t("TOOL_GET_ISSUES_COUNT", "Number of issues to retrieve")),
  customFields: z.array(z.object({
    id: z.number().describe(t("TOOL_GET_ISSUES_CUSTOM_FIELD_ID", "Custom field ID")),
    value: z.union([
      z.string(),
      z.number(),
      z.array(z.string())
    ]).describe(t("TOOL_GET_ISSUES_CUSTOM_FIELD_VALUE", "Custom field value"))
  })).optional().describe(t("TOOL_GET_ISSUES_CUSTOM_FIELDS", "Custom field filters")),
}));

export const getIssuesTool = (backlog: Backlog, { t }: TranslationHelper): ToolDefinition<ReturnType<typeof getIssuesSchema>, typeof IssueSchema["shape"]> => {
  return {
    name: "get_issues",
    description: t("TOOL_GET_ISSUES_DESCRIPTION", "Returns list of issues"),
    schema: z.object(getIssuesSchema(t)),
    importantFields: ["projectId", "issueKey", "keyId", "summary", "description", "issueType"],
    outputSchema: IssueSchema,
    handler: async (params) => {
      const { customFields, ...rest } = params;
      return backlog.getIssues({
        ...rest,
        ...customFieldsToPayload(customFields)
      });
    },
  };
};
