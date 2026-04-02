import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, DynamicToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { buildAttachmentResult } from '../utils/buildAttachmentResult.js';

const getWikiAttachmentSchema = buildToolSchema((t) => ({
  wikiId: z
    .number()
    .describe(
      t('TOOL_GET_WIKI_ATTACHMENT_WIKI_ID', 'The numeric ID of the wiki page')
    ),
  attachmentId: z
    .number()
    .describe(
      t(
        'TOOL_GET_WIKI_ATTACHMENT_ATTACHMENT_ID',
        'The numeric ID of the attachment'
      )
    ),
  responseMode: z
    .enum(['metadata', 'auto', 'inline'])
    .optional()
    .describe(
      t(
        'TOOL_GET_WIKI_ATTACHMENT_RESPONSE_MODE',
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
        'TOOL_GET_WIKI_ATTACHMENT_MAX_INLINE_BYTES',
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
        'TOOL_GET_WIKI_ATTACHMENT_MAX_VIDEO_INLINE_BYTES',
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
        'TOOL_GET_WIKI_ATTACHMENT_MAX_IMAGE_WIDTH',
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
        'TOOL_GET_WIKI_ATTACHMENT_IMAGE_QUALITY',
        'Preferred image quality used when compressing inline-ready images.'
      )
    ),
  fallbackToMetadata: z
    .boolean()
    .optional()
    .describe(
      t(
        'TOOL_GET_WIKI_ATTACHMENT_FALLBACK_TO_METADATA',
        'When true, returns metadata instead of an error if inline mode exceeds the byte limit.'
      )
    ),
}));

export const getWikiAttachmentTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): DynamicToolDefinition<ReturnType<typeof getWikiAttachmentSchema>> => {
  return {
    name: 'get_wiki_attachment',
    description: t(
      'TOOL_GET_WIKI_ATTACHMENT_DESCRIPTION',
      'Downloads an attachment file from a wiki page. Returns the file content as base64-encoded data with its MIME type.'
    ),
    schema: z.object(getWikiAttachmentSchema(t)),
    handler: async ({
      wikiId,
      attachmentId,
      responseMode,
      maxInlineBytes,
      maxVideoInlineBytes,
      maxImageWidth,
      imageQuality,
      fallbackToMetadata,
    }) => {
      const fileData = await backlog.getWikiAttachment(wikiId, attachmentId);
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
