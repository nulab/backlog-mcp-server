import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { VersionSchema } from '../types/zod/backlogOutputDefinition.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';

const addVersionMilestoneSchema = buildToolSchema((t) => ({
    projectKey: z
        .string()
        .optional()
        .describe(t('TOOL_ADD_VERSION_MILESTONE_PROJECT_KEY', 'Project key')),
    projectId: z
        .number()
        .optional()
        .describe(t('TOOL_ADD_VERSION_MILESTONE_PROJECT_ID', 'Project ID')),
    name: z.string().describe(t('TOOL_ADD_VERSION_MILESTONE_NAME', 'Version name')),
    description: z
        .string()
        .optional()
        .describe(t('TOOL_ADD_VERSION_MILESTONE_DESCRIPTION', 'Version description')),
    startDate: z
        .string()
        .optional()
        .describe(t('TOOL_ADD_VERSION_MILESTONE_START_DATE', 'Start date of the version')),
    releaseDueDate: z
        .string()
        .optional()
        .describe(t('TOOL_ADD_VERSION_MILESTONE_RELEASE_DUE_DATE', 'Release due date of the version'))
}));

export const addVersionMilestoneTool = (
    backlog: Backlog,
    { t }: TranslationHelper
): ToolDefinition<
    ReturnType<typeof addVersionMilestoneSchema>,
    (typeof VersionSchema)['shape']
> => {
    return {
        name: 'add_version_milestone',
        description: t('TOOL_ADD_VERSION_MILESTONE_DESCRIPTION', 'Creates a new version milestone'),
        schema: z.object(addVersionMilestoneSchema(t)),
        outputSchema: VersionSchema,
        importantFields: ['id', 'name', 'description', 'startDate', 'releaseDueDate'],
        handler: async ({ projectId, projectKey, ...params }) => {
            const result = resolveIdOrKey(
                'project',
                { id: projectId, key: projectKey },
                t
            );
            if (!result.ok) {
                throw result.error;
            }
            return backlog.postVersions(result.value, params)
        }
    };
}