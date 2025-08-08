import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { VersionSchema } from '../types/zod/backlogOutputDefinition.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';

const updateVersionMilestoneSchema = buildToolSchema((t) => ({
    projectId: z
        .number()
        .optional()
        .describe(
            t(
                'TOOL_UPDATE_VERSION_MILESTONE_PROJECT_ID',
                'The numeric ID of the project (e.g., 12345)'
            )
        ),
    projectKey: z
        .string()
        .optional()
        .describe(
            t(
                'TOOL_UPDATE_VERSION_MILESTONE_PROJECT_KEY',
                "The key of the project (e.g., 'PROJECT')"
            )
        ),
    id: z
        .number()
        .describe(t('TOOL_UPDATE_VERSION_MILESTONE_ID', 'Version ID')),
    name: z
        .string()
        .describe(t('TOOL_UPDATE_VERSION_MILESTONE_NAME', 'Version name')),
    description: z
        .string()
        .optional()
        .describe(t('TOOL_UPDATE_VERSION_MILESTONE_DESCRIPTION', 'Version description')),
    startDate: z
        .string()
        .optional()
        .describe(t('TOOL_UPDATE_VERSION_MILESTONE_START_DATE', 'Start date')),
    releaseDueDate: z
        .string()
        .optional()
        .describe(t('TOOL_UPDATE_VERSION_MILESTONE_RELEASE_DUE_DATE', 'Release due date')),
    archived: z
        .boolean()
        .optional()
        .describe(t('TOOL_UPDATE_VERSION_MILESTONE_ARCHIVED', 'Archive status of the version')),
}))

export const updateVersionMilestoneTool = (
    backlog: Backlog,
    { t }: TranslationHelper
): ToolDefinition<
    ReturnType<typeof updateVersionMilestoneSchema>,
    (typeof VersionSchema)['shape']
> => {
    return {
        name: 'update_version_milestone',
        description: t(
            'TOOL_UPDATE_VERSION_MILESTONE_DESCRIPTION',
            'Updates an existing version milestone'
        ),
        schema: z.object(updateVersionMilestoneSchema(t)),
        outputSchema: VersionSchema,
        importantFields: ['id', 'name', 'description', 'startDate', 'releaseDueDate', 'archived'],
        handler: async ({ projectId, projectKey, id, ...params }) => {
            const result = resolveIdOrKey(
                'project',
                { id: projectId, key: projectKey },
                t
            );
            if (!result.ok) {
                throw result.error;
            }
            if (!id) {
                throw new Error(t('TOOL_UPDATE_VERSION_MILESTONE_ID_REQUIRED', 'Version ID is required'));
            }
            return backlog.patchVersions(result.value, id, params);
        },
    };
}