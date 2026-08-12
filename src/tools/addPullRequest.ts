import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { resolveIdOrKey, resolveIdOrName } from '../utils/resolveIdOrKey.js';

const addPullRequestSchema = buildToolSchema((t) => ({
  projectId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_ADD_PULL_REQUEST_PROJECT_ID',
        'The numeric ID of the project (e.g., 12345)'
      )
    ),
  projectKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_ADD_PULL_REQUEST_PROJECT_KEY',
        "The key of the project (e.g., 'PROJECT')"
      )
    ),
  repoId: z
    .number()
    .optional()
    .describe(t('TOOL_ADD_PULL_REQUEST_REPO_ID', 'Repository ID')),
  repoName: z
    .string()
    .optional()
    .describe(t('TOOL_ADD_PULL_REQUEST_REPO_NAME', 'Repository name')),
  summary: z
    .string()
    .describe(
      t('TOOL_ADD_PULL_REQUEST_SUMMARY', 'Summary of the pull request')
    ),
  description: z
    .string()
    .describe(
      t('TOOL_ADD_PULL_REQUEST_DESCRIPTION', 'Description of the pull request')
    ),
  base: z
    .string()
    .describe(t('TOOL_ADD_PULL_REQUEST_BASE', 'Base branch name')),
  branch: z
    .string()
    .describe(t('TOOL_ADD_PULL_REQUEST_BRANCH', 'Branch name to merge')),
  issueId: z
    .number()
    .optional()
    .describe(t('TOOL_ADD_PULL_REQUEST_ISSUE_ID', 'Issue ID to link')),
  assigneeId: z
    .number()
    .optional()
    .describe(
      t('TOOL_ADD_PULL_REQUEST_ASSIGNEE_ID', 'User ID of the assignee')
    ),
  notifiedUserId: z
    .array(z.number())
    .optional()
    .describe(
      t('TOOL_ADD_PULL_REQUEST_NOTIFIED_USER_ID', 'User IDs to notify')
    ),
}));

export const addPullRequestTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof addPullRequestSchema>,
  Entity.PullRequest.PullRequest
> => {
  return {
    name: 'add_pull_request',
    description: t(
      'TOOL_ADD_PULL_REQUEST_DESCRIPTION',
      'Creates a new pull request'
    ),
    schema: z.object(addPullRequestSchema(t)),
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
    handler: async ({ projectId, projectKey, repoId, repoName, ...params }) => {
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
      return backlog.postPullRequest(
        result.value,
        String(repoRes.value),
        params
      );
    },
  };
};
