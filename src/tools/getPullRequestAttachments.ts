import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { PullRequestFileInfoSchema } from '../types/zod/backlogOutputDefinition.js';
import { resolveIdOrKey, resolveIdOrName } from '../utils/resolveIdOrKey.js';

const getPullRequestAttachmentsSchema = buildToolSchema((t) => ({
  projectId: z
    .number()
    .optional()
    .describe(
      t('TOOL_GET_PR_ATTACHMENTS_PROJECT_ID', 'The numeric ID of the project')
    ),
  projectKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_GET_PR_ATTACHMENTS_PROJECT_KEY',
        "The key of the project (e.g., 'PROJ')"
      )
    ),
  repoId: z
    .number()
    .optional()
    .describe(t('TOOL_GET_PR_ATTACHMENTS_REPO_ID', 'Repository ID')),
  repoName: z
    .string()
    .optional()
    .describe(t('TOOL_GET_PR_ATTACHMENTS_REPO_NAME', 'Repository name')),
  number: z
    .number()
    .describe(t('TOOL_GET_PR_ATTACHMENTS_NUMBER', 'The pull request number')),
}));

export const getPullRequestAttachmentsTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof getPullRequestAttachmentsSchema>,
  (typeof PullRequestFileInfoSchema)['shape']
> => {
  return {
    name: 'get_pull_request_attachments',
    description: t(
      'TOOL_GET_PR_ATTACHMENTS_DESCRIPTION',
      'Returns list of attachments for a pull request'
    ),
    schema: z.object(getPullRequestAttachmentsSchema(t)),
    outputSchema: PullRequestFileInfoSchema,
    handler: async ({ projectId, projectKey, repoId, repoName, number }) => {
      const result = resolveIdOrKey(
        'project',
        { id: projectId, key: projectKey },
        t
      );
      if (!result.ok) {
        throw result.error;
      }

      const repoResult = resolveIdOrName(
        'repository',
        { id: repoId, name: repoName },
        t
      );
      if (!repoResult.ok) {
        throw repoResult.error;
      }

      return backlog.getPullRequestAttachments(
        result.value,
        String(repoResult.value),
        number
      );
    },
  };
};
