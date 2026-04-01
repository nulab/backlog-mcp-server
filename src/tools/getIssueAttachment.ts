import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, DynamicToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';
import { streamToBase64 } from '../utils/streamToBase64.js';
import { getMimeType } from '../utils/getMimeType.js';
import {
  buildFileContent,
  tryDecodeFilename,
} from '../utils/buildFileContent.js';

const getIssueAttachmentSchema = buildToolSchema((t) => ({
  issueId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_GET_ISSUE_ATTACHMENT_ISSUE_ID',
        'The numeric ID of the issue (e.g., 12345)'
      )
    ),
  issueKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_GET_ISSUE_ATTACHMENT_ISSUE_KEY',
        "The key of the issue (e.g., 'PROJ-123')"
      )
    ),
  attachmentId: z
    .number()
    .describe(
      t(
        'TOOL_GET_ISSUE_ATTACHMENT_ATTACHMENT_ID',
        'The numeric ID of the attachment'
      )
    ),
}));

export const getIssueAttachmentTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): DynamicToolDefinition<ReturnType<typeof getIssueAttachmentSchema>> => {
  return {
    name: 'get_issue_attachment',
    description: t(
      'TOOL_GET_ISSUE_ATTACHMENT_DESCRIPTION',
      'Downloads an attachment file from an issue. Returns the file content as base64-encoded data with its MIME type.'
    ),
    schema: z.object(getIssueAttachmentSchema(t)),
    handler: async ({ issueId, issueKey, attachmentId }) => {
      const result = resolveIdOrKey('issue', { id: issueId, key: issueKey }, t);
      if (!result.ok) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: result.error.message }],
        };
      }

      const fileData = await backlog.getIssueAttachment(
        result.value,
        attachmentId
      );
      const rawFilename =
        'filename' in fileData ? (fileData.filename as string) : '';
      const filename = tryDecodeFilename(rawFilename);
      const mimeType = getMimeType(filename);
      const base64 = await streamToBase64(fileData.body);

      return buildFileContent(filename, mimeType, base64, fileData.url);
    },
  };
};
