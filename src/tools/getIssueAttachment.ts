import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, DynamicToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';
import { buildAttachmentResult } from '../utils/buildAttachmentResult.js';

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
  responseMode: z
    .enum(['metadata', 'auto', 'inline'])
    .optional()
    .describe(
      t(
        'TOOL_GET_ISSUE_ATTACHMENT_RESPONSE_MODE',
        "Response mode: 'metadata' returns only attachment details, 'auto' inlines only images within size limits, 'inline' always attempts inline content first."
      )
    ),
  maxInlineBytes: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      t(
        'TOOL_GET_ISSUE_ATTACHMENT_MAX_INLINE_BYTES',
        'Maximum attachment size in bytes to inline when using auto or inline mode.'
      )
    ),
  maxVideoInlineBytes: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      t(
        'TOOL_GET_ISSUE_ATTACHMENT_MAX_VIDEO_INLINE_BYTES',
        'Maximum video size in bytes to inline when using inline mode.'
      )
    ),
  maxImageWidth: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      t(
        'TOOL_GET_ISSUE_ATTACHMENT_MAX_IMAGE_WIDTH',
        'Maximum image width used when preparing inline-ready images.'
      )
    ),
  imageQuality: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe(
      t(
        'TOOL_GET_ISSUE_ATTACHMENT_IMAGE_QUALITY',
        'Preferred image quality used when compressing inline-ready images.'
      )
    ),
  fallbackToMetadata: z
    .boolean()
    .optional()
    .describe(
      t(
        'TOOL_GET_ISSUE_ATTACHMENT_FALLBACK_TO_METADATA',
        'When true, returns metadata instead of an error if inline mode exceeds the byte limit.'
      )
    ),
  outputFormat: z
    .enum(['default', 'raw_base64'])
    .optional()
    .describe(
      t(
        'TOOL_GET_ISSUE_ATTACHMENT_OUTPUT_FORMAT',
        "Output format: 'default' renders images inline or as resource blobs, 'raw_base64' returns the raw base64 string as text so it can be passed to other tools."
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
    handler: async ({
      issueId,
      issueKey,
      attachmentId,
      responseMode,
      maxInlineBytes,
      maxVideoInlineBytes,
      maxImageWidth,
      imageQuality,
      fallbackToMetadata,
      outputFormat,
    }) => {
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
      return buildAttachmentResult({
        body: fileData.body,
        filename: 'filename' in fileData ? (fileData.filename as string) : '',
        responseMode,
        outputFormat,
        maxInlineBytes,
        maxVideoInlineBytes,
        maxImageWidth,
        imageQuality,
        fallbackToMetadata,
        url: fileData.url,
      });
    },
  };
};
