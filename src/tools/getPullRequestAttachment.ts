import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, DynamicToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';
import { streamToBase64 } from '../utils/streamToBase64.js';
import { getMimeType } from '../utils/getMimeType.js';
import { buildFileContent } from '../utils/buildFileContent.js';

const getPullRequestAttachmentSchema = buildToolSchema((t) => ({
  projectId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_GET_PR_ATTACHMENT_PROJECT_ID',
        'The numeric ID of the project'
      )
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
  repoIdOrName: z
    .string()
    .describe(
      t(
        'TOOL_GET_PR_ATTACHMENT_REPO',
        'The repository ID or name'
      )
    ),
  number: z
    .number()
    .describe(
      t(
        'TOOL_GET_PR_ATTACHMENT_NUMBER',
        'The pull request number'
      )
    ),
  attachmentId: z
    .number()
    .describe(
      t(
        'TOOL_GET_PR_ATTACHMENT_ATTACHMENT_ID',
        'The numeric ID of the attachment'
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
      repoIdOrName,
      number,
      attachmentId,
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

      const fileData = await backlog.getPullRequestAttachment(
        result.value,
        repoIdOrName,
        number,
        attachmentId
      );
      const filename =
        'filename' in fileData ? (fileData.filename as string) : 'attachment';
      const mimeType = getMimeType(filename);
      const base64 = await streamToBase64(fileData.body);

      return buildFileContent(filename, mimeType, base64, fileData.url);
    },
  };
};
