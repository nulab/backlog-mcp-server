import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { resolveIdOrKey, resolveIdOrName } from '../utils/resolveIdOrKey.js';

const getPullRequestSchema = buildToolSchema((t) => ({
  projectId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_GET_PULL_REQUEST_PROJECT_ID',
        'The numeric ID of the project (e.g., 12345)'
      )
    ),
  projectKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_GET_PULL_REQUEST_PROJECT_KEY',
        "The key of the project (e.g., 'PROJECT')"
      )
    ),
  repoId: z
    .number()
    .optional()
    .describe(t('TOOL_GET_PULL_REQUEST_REPO_ID', 'Repository ID')),
  repoName: z
    .string()
    .optional()
    .describe(t('TOOL_GET_PULL_REQUEST_REPO_NAME', 'Repository name')),
  number: z
    .number()
    .describe(t('TOOL_GET_PULL_REQUEST_NUMBER', 'Pull request number')),
}));

export const getPullRequestTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof getPullRequestSchema>,
  Entity.PullRequest.PullRequest
> => {
  return {
    name: 'get_pull_request',
    description: t(
      'TOOL_GET_PULL_REQUEST_DESCRIPTION',
      'Returns information about a specific pull request'
    ),
    schema: z.object(getPullRequestSchema(t)),
    returnsList: false,
    outputFields: outputFields<Entity.PullRequest.PullRequest>()([
      'id',
      'projectId',
      'repositoryId',
      'number',
      'summary',
      'description',
      'base',
      'branch',
      'status',
      'assignee',
      'issue',
      'baseCommit',
      'branchCommit',
      'mergeCommit',
      'closeAt',
      'mergeAt',
      'createdUser',
      'created',
      'updatedUser',
      'updated',
      'attachments',
      'stars',
    ]),
    handler: async ({ projectId, projectKey, repoId, repoName, number }) => {
      const result = resolveIdOrKey(
        'project',
        { id: projectId, key: projectKey },
        t
      );
      if (!result.ok) {
        throw result.error;
      }
      const repoRes = resolveIdOrName(
        'repository',
        { id: repoId, name: repoName },
        t
      );
      if (!repoRes.ok) {
        throw repoRes.error;
      }
      return backlog.getPullRequest(
        result.value,
        String(repoRes.value),
        number
      );
    },
  };
};
