import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { CategorySchema } from '../types/zod/backlogOutputDefinition.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';

const getCategoriesSchema = buildToolSchema((t) => ({
  projectId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_GET_CATEGORIES_PROJECT_ID',
        'The numeric ID of the project (e.g., 12345)'
      )
    ),
  projectKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_GET_CATEGORIES_PROJECT_ID',
        "The key of the project (e.g., 'PROJECT')"
      )
    ),
}));

export const getCategoriesTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof getCategoriesSchema>,
  (typeof CategorySchema)['shape']
> => {
  return {
    name: 'get_categories',
    description: t(
      'TOOL_GET_CATEGORIES_DESCRIPTION',
      'Returns list of categories for a project'
    ),
    schema: z.object(getCategoriesSchema(t)),
    importantFields: ['id', 'projectId', 'name'],
    outputSchema: CategorySchema,
    handler: async ({ projectId, projectKey }) => {
      const result = resolveIdOrKey(
        'project',
        { id: projectId, key: projectKey },
        t
      );
      if (!result.ok) {
        throw result.error;
      }
      return backlog.getCategories(result.value);
    },
  };
};
