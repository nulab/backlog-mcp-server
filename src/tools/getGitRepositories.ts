import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';

const getGitRepositoriesSchema = buildToolSchema((t) => ({
  projectId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_GET_GIT_REPOSITORIES_PROJECT_ID',
        'The numeric ID of the project (e.g., 12345)'
      )
    ),
  projectKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_GET_GIT_REPOSITORIES_PROJECT_KEY',
        "The key of the project (e.g., 'PROJECT')"
      )
    ),
}));

export const getGitRepositoriesTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof getGitRepositoriesSchema>,
  Entity.Git.GitRepository
> => {
  return {
    name: 'get_git_repositories',
    description: t(
      'TOOL_GET_GIT_REPOSITORIES_DESCRIPTION',
      'Returns list of Git repositories for a project'
    ),
    schema: z.object(getGitRepositoriesSchema(t)),
    returnsList: true,
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
    handler: async ({ projectId, projectKey }) => {
      const result = resolveIdOrKey(
        'project',
        { id: projectId, key: projectKey },
        t
      );
      if (!result.ok) {
        throw result.error;
      }
      return backlog.getGitRepositories(result.value);
    },
  };
};
