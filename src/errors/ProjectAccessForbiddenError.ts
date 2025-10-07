// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { ReadGuardPolicy, WriteGuardPolicy } from '../config.js';

export interface ProjectAccessForbiddenErrorData {
  allowedProjectIds: (string | number)[];
  requestedProjectId?: number;
  requestedProjectKey?: string;
  requestedProjectIds?: number[];
}

export class ProjectAccessForbiddenError extends Error {
  public readonly code = -32040;
  public readonly data: ProjectAccessForbiddenErrorData;

  constructor(message: string, data: ProjectAccessForbiddenErrorData) {
    super(message);
    this.name = 'ProjectAccessForbiddenError';
    this.data = data;
  }
}
