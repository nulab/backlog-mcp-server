import { z } from "zod";
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from "../createTranslationHelper.js";
import { IssueCommentSchema } from "../types/zod/backlogOutputDefinition.js";

const addIssueCommentSchema = buildToolSchema(t => ({
  issueIdOrKey: z.string().describe(t("TOOL_ADD_ISSUE_COMMENT_ISSUE_ID_OR_KEY", "The issue key (e.g., 'HOME-999') or issue ID (e.g., '1234') as a string")),
  content: z.string().describe(t("TOOL_ADD_ISSUE_COMMENT_CONTENT", "Comment content")),
  notifiedUserId: z.array(z.number()).optional().describe(t("TOOL_ADD_ISSUE_COMMENT_NOTIFIED_USER_ID", "User IDs to notify")),
  attachmentId: z.array(z.number()).optional().describe(t("TOOL_ADD_ISSUE_COMMENT_ATTACHMENT_ID", "Attachment IDs")),
}));

export const addIssueCommentTool = (backlog: Backlog, { t }: TranslationHelper): ToolDefinition<ReturnType<typeof addIssueCommentSchema>,typeof IssueCommentSchema["shape"]> => {
  return {
    name: "add_issue_comment",
    description: t("TOOL_ADD_ISSUE_COMMENT_DESCRIPTION", "Adds a comment to an issue"),
    schema: z.object(addIssueCommentSchema(t)),
    outputSchema: IssueCommentSchema, 
    handler: async ({ issueIdOrKey, content, notifiedUserId, attachmentId }) => backlog.postIssueComments(issueIdOrKey, {
        content,
        notifiedUserId,
        attachmentId
      })
    }
};
