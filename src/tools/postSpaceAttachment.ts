import { readFile, access } from 'node:fs/promises';
import { basename } from 'node:path';
import { Buffer } from 'node:buffer';
import { Backlog } from 'backlog-js';
import { z } from 'zod';
import { TranslationHelper } from '../createTranslationHelper.js';
import { SpaceAttachmentSchema } from '../types/zod/backlogOutputDefinition.js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';

const postSpaceAttachmentSchema = buildToolSchema((t) => ({
  filePath: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_POST_SPACE_ATTACHMENT_FILE_PATH',
        'Absolute path to a local file to upload. When provided, fileContent and fileName are optional (fileName defaults to the basename of the path).'
      )
    ),
  fileName: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_POST_SPACE_ATTACHMENT_FILE_NAME',
        'The name of the file to upload (e.g., "screenshot.png"). Required when using fileContent; optional when using filePath (defaults to basename).'
      )
    ),
  fileContent: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_POST_SPACE_ATTACHMENT_FILE_CONTENT',
        'The file content encoded as a base64 string. Either filePath or fileContent must be provided.'
      )
    ),
}));

export const postSpaceAttachmentTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof postSpaceAttachmentSchema>,
  (typeof SpaceAttachmentSchema)['shape']
> => {
  return {
    name: 'post_space_attachment',
    description: t(
      'TOOL_POST_SPACE_ATTACHMENT_DESCRIPTION',
      'Uploads a file to Backlog space. Returns the attachment ID which can be used when creating or updating issues, comments, or wiki pages. The uploaded file will be deleted after it has been attached, or an hour later if not attached. Provide either filePath (for local files) or fileContent (base64-encoded string).'
    ),
    schema: z.object(postSpaceAttachmentSchema(t)),
    outputSchema: SpaceAttachmentSchema,
    handler: async ({ filePath, fileName, fileContent }) => {
      if (!filePath && !fileContent) {
        throw new Error(
          t(
            'TOOL_POST_SPACE_ATTACHMENT_INPUT_REQUIRED',
            'Either filePath or fileContent must be provided'
          )
        );
      }

      let buffer: Buffer;
      let name: string;

      if (filePath) {
        await access(filePath).catch(() => {
          throw new Error(
            t(
              'TOOL_POST_SPACE_ATTACHMENT_FILE_NOT_FOUND',
              `File not found: ${filePath}`
            )
          );
        });
        buffer = await readFile(filePath);
        name = fileName ?? basename(filePath);
      } else {
        if (!fileName) {
          throw new Error(
            t(
              'TOOL_POST_SPACE_ATTACHMENT_NAME_REQUIRED',
              'fileName is required when using fileContent'
            )
          );
        }
        buffer = Buffer.from(fileContent!, 'base64');
        name = fileName;
      }

      const blob = new Blob([buffer]);
      const form = new FormData();
      form.append('file', blob, name);
      return backlog.postSpaceAttachment(form);
    },
  };
};
