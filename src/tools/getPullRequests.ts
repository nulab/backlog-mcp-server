import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { PullRequestSchema } from '../types/zod/backlogOutputDefinition.js';
import { resolveIdOrKey, resolveIdOrName } from '../utils/resolveIdOrKey.js';

const getPullRequestsSchema = buildToolSchema((t) => ({
  projectId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_GET_PULL_REQUESTS_PROJECT_ID',
        'The numeric ID of the project (e.g., 12345)'
      )
    ),
  projectKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_GET_PULL_REQUESTS_PROJECT_KEY',
        "The key of the project (e.g., 'PROJECT')"
      )
    ),
  repoId: z
    .number()
    .optional()
    .describe(t('TOOL_GET_PULL_REQUESTS_REPO_ID', 'Repository ID')),
  repoName: z
    .string()
    .optional()
    .describe(t('TOOL_GET_PULL_REQUESTS_REPO_NAME', 'Repository name')),
  statusId: z
    .array(z.number())
    .optional()
    .describe(t('TOOL_GET_PULL_REQUESTS_STATUS_ID', 'Status IDs')),
  assigneeId: z
    .array(z.number())
    .optional()
    .describe(t('TOOL_GET_PULL_REQUESTS_ASSIGNEE_ID', 'Assignee user IDs')),
  issueId: z
    .array(z.number())
    .optional()
    .describe(t('TOOL_GET_PULL_REQUESTS_ISSUE_ID', 'Issue IDs')),
  createdUserId: z
    .array(z.number())
    .optional()
    .describe(t('TOOL_GET_PULL_REQUESTS_CREATED_USER_ID', 'Created user IDs')),
  offset: z
    .number()
    .optional()
    .describe(t('TOOL_GET_PULL_REQUESTS_OFFSET', 'Offset for pagination')),
  count: z
    .number()
    .optional()
    .describe(
      t('TOOL_GET_PULL_REQUESTS_COUNT', 'Number of pull requests to retrieve')
    ),
}));

export const getPullRequestsTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof getPullRequestsSchema>,
  (typeof PullRequestSchema)['shape']
> => {
  return {
    name: 'get_pull_requests',
    description: t(
      'TOOL_GET_PULL_REQUESTS_DESCRIPTION',
      'Returns list of pull requests for a repository'
    ),
    schema: z.object(getPullRequestsSchema(t)),
    outputSchema: PullRequestSchema,
    handler: async ({ projectId, projectKey, repoId, repoName, ...params }) => {
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
      return backlog.getPullRequests(
        result.value,
        String(repoResult.value),
        params
      );
    },
  };
};
