import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { PullRequestCommentSchema } from '../types/zod/backlogOutputDefinition.js';
import { resolveIdOrKey, resolveIdOrName } from '../utils/resolveIdOrKey.js';

const getPullRequestCommentsSchema = buildToolSchema((t) => ({
  projectId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_GET_PROJECT_PROJECT_ID',
        'The numeric ID of the project (e.g., 12345)'
      )
    ),
  projectKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_GET_PROJECT_PROJECT_KEY',
        "The key of the project (e.g., 'PROJECT')"
      )
    ),
  repoId: z
    .number()
    .optional()
    .describe(
      t('TOOL_GET_PULL_REQUEST_COMMENTS_REPO_ID_OR_NAME', 'Repository ID')
    ),
  repoName: z
    .string()
    .optional()
    .describe(
      t('TOOL_GET_PULL_REQUEST_COMMENTS_REPO_ID_OR_NAME', 'Repository name')
    ),
  number: z
    .number()
    .describe(
      t('TOOL_GET_PULL_REQUEST_COMMENTS_NUMBER', 'Pull request number')
    ),
  minId: z
    .number()
    .optional()
    .describe(t('TOOL_GET_PULL_REQUEST_COMMENTS_MIN_ID', 'Minimum comment ID')),
  maxId: z
    .number()
    .optional()
    .describe(t('TOOL_GET_PULL_REQUEST_COMMENTS_MAX_ID', 'Maximum comment ID')),
  count: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_GET_PULL_REQUEST_COMMENTS_COUNT',
        'Number of comments to retrieve'
      )
    ),
  order: z
    .enum(['asc', 'desc'])
    .optional()
    .describe(t('TOOL_GET_PULL_REQUEST_COMMENTS_ORDER', 'Sort order')),
}));

export const getPullRequestCommentsTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof getPullRequestCommentsSchema>,
  (typeof PullRequestCommentSchema)['shape']
> => {
  return {
    name: 'get_pull_request_comments',
    description: t(
      'TOOL_GET_PULL_REQUEST_COMMENTS_DESCRIPTION',
      'Returns list of comments for a pull request'
    ),
    schema: z.object(getPullRequestCommentsSchema(t)),
    outputSchema: PullRequestCommentSchema,
    handler: async ({
      projectId,
      projectKey,
      repoId,
      repoName,
      number,
      ...params
    }) => {
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
      return backlog.getPullRequestComments(
        result.value,
        String(repoResult.value),
        number,
        params
      );
    },
  };
};
