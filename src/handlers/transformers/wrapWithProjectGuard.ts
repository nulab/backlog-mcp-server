// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { ProjectGuardService } from '../../guards/ProjectGuardService.js';
import {
  ProjectAccessForbiddenError,
  ProjectAccessForbiddenErrorData,
} from '../../errors/ProjectAccessForbiddenError.js';
import { Backlog } from 'backlog-js';
import { logger } from '../../utils/logger.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ToolHandler = (params: any) => Promise<any>;

export const wrapWithProjectGuard = (
  handler: ToolHandler,
  toolName: string,
  guardService: ProjectGuardService,
  backlog: Backlog
): ToolHandler => {
  return async (params: any) => {
    const { projectId, projectKey, projectIds } = params;

    const isNilOrEmpty = (value: unknown): boolean => {
      if (value === null || value === undefined) {
        return true;
      }
      if (typeof value === 'string') {
        return value.trim().length === 0;
      }
      if (Array.isArray(value)) {
        return value.length === 0;
      }
      return false;
    };

    if (
      isNilOrEmpty(projectId) &&
      isNilOrEmpty(projectKey) &&
      isNilOrEmpty(projectIds)
    ) {
      logger.debug(
        { toolName, result: 'skipped' },
        'Project guard skipped (no project context provided)'
      );
      return handler(params);
    }

    const coerceToNumericIds = (value: unknown): number[] => {
      if (Array.isArray(value)) {
        return value
          .map((item) => Number(item))
          .filter((id) => Number.isFinite(id));
      }
      const numericValue = Number(value);
      return Number.isFinite(numericValue) ? [numericValue] : [];
    };

    const primaryCandidates = coerceToNumericIds(projectId);
    const secondaryCandidates = coerceToNumericIds(projectIds);

    const resolveCandidate = (candidates: number[]): number[] => {
      if (candidates.length === 0) {
        return [];
      }
      const allowed = candidates.find((id) => guardService.isAllowed(id));
      return allowed ? [allowed] : [candidates[0]];
    }

    let targetProjectIds: number[] = resolveCandidate(primaryCandidates);

    if (projectKey) {
      // This is a simplified resolution. A real implementation would cache.
      const project = await backlog.getProject(projectKey);
      targetProjectIds = [project.id];
    }

    for(const targetProjectId of targetProjectIds) {
      if (!targetProjectId || !guardService.isAllowed(targetProjectId)) {
        const errorData: ProjectAccessForbiddenErrorData = {
          allowedProjectIds: [...guardService.getAllowedProjectIds()],
          requestedProjectId: targetProjectId,
          requestedProjectKey: projectKey,
          requestedProjectIds:
            primaryCandidates.length || secondaryCandidates.length
              ? [...primaryCandidates, ...secondaryCandidates]
              : undefined,
        };
        logger.warn(
          { toolName, result: 'blocked', ...errorData },
          'Project write access blocked'
        );
        throw new ProjectAccessForbiddenError(
          'Write operation is not allowed for this project',
          errorData
        );
      }
    }
    
    logger.info(
      {
        toolName,
        result: 'allowed',
        projectIds: targetProjectIds,
      },
      'Project write access allowed'
    );
    return handler(params);
  };
};
