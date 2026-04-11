import { Backlog } from 'backlog-js';
import { z } from 'zod';
import { ToolDefinition, buildToolSchema } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { CustomFieldSchema } from '../types/zod/backlogOutputDefinition.js';
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
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof getCustomFieldsInputSchema>, // Shape for input schema
  (typeof CustomFieldSchema)['shape'] // Shape for output schema (single item)
> => {
  const inputSchemaObject = z.object(getCustomFieldsInputSchema(t)); // Create the ZodObject for input

  return {
    name: 'get_custom_fields',
    description: t(
      'TOOL_GET_CUSTOM_FIELDS_DESCRIPTION',
      'Returns list of custom fields for a project'
    ),
    schema: inputSchemaObject,
    outputSchema: CustomFieldSchema,
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
