import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { GitRepositorySchema } from '../types/zod/backlogOutputDefinition.js';
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
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof getGitRepositoriesSchema>,
  (typeof GitRepositorySchema)['shape']
> => {
  return {
    name: 'get_git_repositories',
    description: t(
      'TOOL_GET_GIT_REPOSITORIES_DESCRIPTION',
      'Returns list of Git repositories for a project'
    ),
    schema: z.object(getGitRepositoriesSchema(t)),
    outputSchema: GitRepositorySchema,
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
