import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { resolveIdOrKey, resolveIdOrName } from '../utils/resolveIdOrKey.js';

const getGitRepositorySchema = buildToolSchema((t) => ({
  projectId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_GET_GIT_REPOSITORY_PROJECT_ID',
        'The numeric ID of the project (e.g., 12345)'
      )
    ),
  projectKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_GET_GIT_REPOSITORY_PROJECT_KEY',
        "The key of the project (e.g., 'PROJECT')"
      )
    ),
  repoId: z
    .number()
    .optional()
    .describe(t('TOOL_GET_GIT_REPOSITORY_REPO_ID', 'Repository ID')),
  repoName: z
    .string()
    .optional()
    .describe(t('TOOL_GET_GIT_REPOSITORY_REPO_NAME', 'Repository name')),
}));

export const getGitRepositoryTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof getGitRepositorySchema>,
  Entity.Git.GitRepository
> => {
  return {
    name: 'get_git_repository',
    description: t(
      'TOOL_GET_GIT_REPOSITORY_DESCRIPTION',
      'Returns information about a specific Git repository'
    ),
    schema: z.object(getGitRepositorySchema(t)),
    returnsList: false,
    outputFields: outputFields<Entity.Git.GitRepository>()([
      'id',
      'projectId',
      'name',
      'description',
      'hookUrl',
      'httpUrl',
      'sshUrl',
      'displayOrder',
      'pushedAt',
      'createdUser',
      'created',
      'updatedUser',
      'updated',
    ]),
    handler: async ({ projectId, projectKey, repoId, repoName }) => {
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
      return backlog.getGitRepository(result.value, String(repoResult.value));
    },
  };
};
