import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, DynamicToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { resolveIdOrKey, resolveIdOrName } from '../utils/resolveIdOrKey.js';
import { buildAttachmentResult } from '../utils/buildAttachmentResult.js';

const getPullRequestAttachmentSchema = buildToolSchema((t) => ({
  projectId: z
    .number()
    .optional()
    .describe(
      t('TOOL_GET_PR_ATTACHMENT_PROJECT_ID', 'The numeric ID of the project')
    ),
  projectKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_GET_PR_ATTACHMENT_PROJECT_KEY',
        "The key of the project (e.g., 'PROJ')"
      )
    ),
  repoId: z
    .number()
    .optional()
    .describe(t('TOOL_GET_PR_ATTACHMENT_REPO_ID', 'Repository ID')),
  repoName: z
    .string()
    .optional()
    .describe(t('TOOL_GET_PR_ATTACHMENT_REPO_NAME', 'Repository name')),
  number: z
    .number()
    .describe(t('TOOL_GET_PR_ATTACHMENT_NUMBER', 'The pull request number')),
  attachmentId: z
    .number()
    .describe(
      t(
        'TOOL_GET_PR_ATTACHMENT_ATTACHMENT_ID',
        'The numeric ID of the attachment'
      )
    ),
  responseMode: z
    .enum(['metadata', 'auto', 'inline'])
    .optional()
    .describe(
      t(
        'TOOL_GET_PR_ATTACHMENT_RESPONSE_MODE',
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
        'TOOL_GET_PR_ATTACHMENT_MAX_INLINE_BYTES',
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
        'TOOL_GET_PR_ATTACHMENT_MAX_VIDEO_INLINE_BYTES',
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
        'TOOL_GET_PR_ATTACHMENT_MAX_IMAGE_WIDTH',
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
        'TOOL_GET_PR_ATTACHMENT_IMAGE_QUALITY',
        'Preferred image quality used when compressing inline-ready images.'
      )
    ),
  fallbackToMetadata: z
    .boolean()
    .optional()
    .describe(
      t(
        'TOOL_GET_PR_ATTACHMENT_FALLBACK_TO_METADATA',
        'When true, returns metadata instead of an error if inline mode exceeds the byte limit.'
      )
    ),
}));

export const getPullRequestAttachmentTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): DynamicToolDefinition<ReturnType<typeof getPullRequestAttachmentSchema>> => {
  return {
    name: 'get_pull_request_attachment',
    description: t(
      'TOOL_GET_PR_ATTACHMENT_DESCRIPTION',
      'Downloads an attachment file from a pull request. Returns the file content as base64-encoded data with its MIME type.'
    ),
    schema: z.object(getPullRequestAttachmentSchema(t)),
    handler: async ({
      projectId,
      projectKey,
      repoId,
      repoName,
      number,
      attachmentId,
      responseMode,
      maxInlineBytes,
      maxVideoInlineBytes,
      maxImageWidth,
      imageQuality,
      fallbackToMetadata,
    }) => {
      const result = resolveIdOrKey(
        'project',
        { id: projectId, key: projectKey },
        t
      );
      if (!result.ok) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: result.error.message }],
        };
      }

      const repoResult = resolveIdOrName(
        'repository',
        { id: repoId, name: repoName },
        t
      );
      if (!repoResult.ok) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: repoResult.error.message }],
        };
      }

      const fileData = await backlog.getPullRequestAttachment(
        result.value,
        String(repoResult.value),
        number,
        attachmentId
      );
      return buildAttachmentResult({
        body: fileData.body,
        filename: 'filename' in fileData ? (fileData.filename as string) : '',
        responseMode,
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
