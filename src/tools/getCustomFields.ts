import type { Entity } from 'backlog-js';
import { Backlog } from 'backlog-js';
import { z } from 'zod';
import { ToolDefinition, buildToolSchema } from '../types/tool.js';
import { outputFields } from '../types/outputFields.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';

const getCustomFieldsInputSchema = buildToolSchema((t) => ({
  projectId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_GET_CUSTOM_FIELDS_PROJECT_ID',
        'The numeric ID of the project (e.g., 12345)'
      )
    ),
  projectKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_GET_CUSTOM_FIELDS_PROJECT_KEY',
        "The key of the project (e.g., 'PROJECT')"
      )
    ),
}));

export const getCustomFieldsTool = (
  backlog: Backlog,
  { t }: DescriptionHelper
): ToolDefinition<
  ReturnType<typeof getCustomFieldsInputSchema>, // Shape for input schema
  Entity.Project.CustomField
> => {
  const inputSchemaObject = z.object(getCustomFieldsInputSchema(t)); // Create the ZodObject for input

  return {
    name: 'get_custom_fields',
    description: t(
      'TOOL_GET_CUSTOM_FIELDS_DESCRIPTION',
      'Returns list of custom fields for a project'
    ),
    schema: inputSchemaObject,
    returnsList: true,
    outputFields: outputFields<Entity.Project.CustomField>()([
      'id',
      'projectId',
      'typeId',
      'name',
      'description',
      'required',
      'useIssueType',
      'applicableIssueTypes',
      'displayOrder',
      'version',
      'min',
      'max',
      'initialValue',
      'unit',
      'initialDate',
      'items',
      'allowAddItem',
      'allowInput',
    ]),
    importantFields: [
      'id',
      'name',
      'typeId',
      'required',
      'applicableIssueTypes',
    ],
    handler: async ({ projectId, projectKey }) => {
      const result = resolveIdOrKey(
        'project',
        { id: projectId, key: projectKey },
        t
      );
      if (!result.ok) {
        throw result.error;
      }
      return backlog.getCustomFields(result.value);
    },
  };
};
