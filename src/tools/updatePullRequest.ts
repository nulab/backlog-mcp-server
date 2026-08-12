import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';

const updatePullRequestSchema = buildToolSchema((t) => ({
  projectId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_UPDATE_PULL_REQUEST_PROJECT_ID',
        'The numeric ID of the project (e.g., 12345)'
      )
    ),
  projectKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_UPDATE_PULL_REQUEST_PROJECT_KEY',
        "The key of the project (e.g., 'PROJECT')"
      )
    ),
  repoId: z
    .number()
    .optional()
    .describe(t('TOOL_UPDATE_PULL_REQUEST_REPO_ID', 'Repository ID')),
  repoName: z
    .string()
    .optional()
    .describe(t('TOOL_UPDATE_PULL_REQUEST_REPO_NAME', 'Repository name')),
  number: z
    .number()
    .describe(t('TOOL_UPDATE_PULL_REQUEST_NUMBER', 'Pull request number')),
  summary: z
    .string()
    .optional()
    .describe(
      t('TOOL_UPDATE_PULL_REQUEST_SUMMARY', 'Summary of the pull request')
    ),
  description: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_UPDATE_PULL_REQUEST_DESCRIPTION',
        'Description of the pull request'
      )
    ),
  issueId: z
    .number()
    .optional()
    .describe(t('TOOL_UPDATE_PULL_REQUEST_ISSUE_ID', 'Issue ID to link')),
  assigneeId: z
    .number()
    .optional()
    .describe(
      t('TOOL_UPDATE_PULL_REQUEST_ASSIGNEE_ID', 'User ID of the assignee')
    ),
  notifiedUserId: z
    .array(z.number())
    .optional()
    .describe(
      t('TOOL_UPDATE_PULL_REQUEST_NOTIFIED_USER_ID', 'User IDs to notify')
    ),
  statusId: z
    .number()
    .optional()
    .describe(t('TOOL_UPDATE_PULL_REQUEST_STATUS_ID', 'Status ID')),
}));

export const updatePullRequestTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof updatePullRequestSchema>,
  Entity.PullRequest.PullRequest
> => {
  return {
    name: 'update_pull_request',
    description: t(
      'TOOL_UPDATE_PULL_REQUEST_DESCRIPTION',
      'Updates an existing pull request'
    ),
    schema: z.object(updatePullRequestSchema(t)),
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
      const resultRepo = resolveIdOrKey(
        'repository',
        { id: repoId, key: repoName },
        t
      );
      if (!resultRepo.ok) {
        throw resultRepo.error;
      }
      return backlog.patchPullRequest(
        result.value,
        String(resultRepo.value),
        number,
        params
      );
    },
  };
};
