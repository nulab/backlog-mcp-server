import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';
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
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof getCategoriesSchema>,
  Entity.Project.Category
> => {
  return {
    name: 'get_categories',
    description: t(
      'TOOL_GET_CATEGORIES_DESCRIPTION',
      'Returns list of categories for a project'
    ),
    schema: z.object(getCategoriesSchema(t)),
    importantFields: ['id', 'projectId', 'name'],
    returnsList: true,
    outputFields: outputFields<Entity.Project.Category>()([
      'id',
      'projectId',
      'name',
      'displayOrder',
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
      return backlog.getCategories(result.value);
    },
  };
};
