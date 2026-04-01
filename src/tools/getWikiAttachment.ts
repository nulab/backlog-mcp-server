import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, DynamicToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { streamToBase64 } from '../utils/streamToBase64.js';
import { getMimeType } from '../utils/getMimeType.js';
import {
  buildFileContent,
  tryDecodeFilename,
} from '../utils/buildFileContent.js';

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
    handler: async ({ wikiId, attachmentId }) => {
      const fileData = await backlog.getWikiAttachment(wikiId, attachmentId);
      const rawFilename =
        'filename' in fileData ? (fileData.filename as string) : '';
      const filename = tryDecodeFilename(rawFilename);
      const mimeType = getMimeType(filename);
      const base64 = await streamToBase64(fileData.body);

      return buildFileContent(filename, mimeType, base64, fileData.url);
    },
  };
};
