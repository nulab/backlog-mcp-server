import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { resolveIdOrKey, resolveIdOrName } from '../utils/resolveIdOrKey.js';

const updatePullRequestCommentSchema = buildToolSchema((t) => ({
  projectId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_UPDATE_PULL_REQUEST_COMMENT_PROJECT_ID',
        'The numeric ID of the project (e.g., 12345)'
      )
    ),
  projectKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_UPDATE_PULL_REQUEST_COMMENT_PROJECT_KEY',
        "The key of the project (e.g., 'PROJECT')"
      )
    ),
  repoId: z
    .number()
    .optional()
    .describe(t('TOOL_UPDATE_PULL_REQUEST_COMMENT_REPO_ID', 'Repository ID')),
  repoName: z
    .string()
    .optional()
    .describe(
      t('TOOL_UPDATE_PULL_REQUEST_COMMENT_REPO_NAME', 'Repository name')
    ),
  number: z
    .number()
    .describe(
      t('TOOL_UPDATE_PULL_REQUEST_COMMENT_NUMBER', 'Pull request number')
    ),
  commentId: z
    .number()
    .describe(t('TOOL_UPDATE_PULL_REQUEST_COMMENT_COMMENT_ID', 'Comment ID')),
  content: z
    .string()
    .describe(t('TOOL_UPDATE_PULL_REQUEST_COMMENT_CONTENT', 'Comment content')),
}));

export const updatePullRequestCommentTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof updatePullRequestCommentSchema>,
  Entity.PullRequest.Comment
> => {
  return {
    name: 'update_pull_request_comment',
    description: t(
      'TOOL_UPDATE_PULL_REQUEST_COMMENT_DESCRIPTION',
      'Updates a comment on a pull request'
    ),
    schema: z.object(updatePullRequestCommentSchema(t)),
    returnsList: false,
    outputFields: outputFields<Entity.PullRequest.Comment>()([
      'id',
      'content',
      'changeLog',
      'createdUser',
      'created',
      'updated',
      'stars',
      'notifications',
    ]),
    importantFields: ['id', 'content', 'createdUser', 'updated'],
    handler: async ({
      projectId,
      projectKey,
      repoId,
      repoName,
      number,
      commentId,
      content,
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
      return backlog.patchPullRequestComments(
        result.value,
        String(repoResult.value),
        number,
        commentId,
        { content }
      );
    },
  };
};
