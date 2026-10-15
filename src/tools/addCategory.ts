import { z } from 'zod';
import type { Entity } from 'backlog-js';
import { postCategories } from 'backlog-js';
import type { Client } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';

const addCategorySchema = buildToolSchema((t) => ({
  projectId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_ADD_CATEGORY_PROJECT_ID',
        'The numeric ID of the project (e.g., 12345)'
      )
    ),
  projectKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_ADD_CATEGORY_PROJECT_KEY',
        "The key of the project (e.g., 'PROJECT')"
      )
    ),
  name: z
    .string()
    .describe(t('TOOL_ADD_CATEGORY_NAME', 'The name of the category')),
}));

export const addCategoryTool = (
  backlog: Client,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof addCategorySchema>,
  Entity.Project.Category
> => {
  return {
    name: 'add_category',
    description: t(
      'TOOL_ADD_CATEGORY_DESCRIPTION',
      'Creates a new category for a project'
    ),
    schema: z.object(addCategorySchema(t)),
    importantFields: ['id', 'projectId', 'name'],
    returnsList: false,
    outputFields: outputFields<Entity.Project.Category>()([
      'id',
      'projectId',
      'name',
      'displayOrder',
    ]),
    handler: async ({ projectId, projectKey, ...params }) => {
      const result = resolveIdOrKey(
        'project',
        { id: projectId, key: projectKey },
        t
      );
      if (!result.ok) {
        throw result.error;
      }
      return postCategories(backlog, result.value, params);
    },
  };
};
