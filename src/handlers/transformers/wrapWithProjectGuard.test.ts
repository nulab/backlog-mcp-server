// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { jest } from '@jest/globals';
import { Backlog } from 'backlog-js';
import { ProjectGuardService } from '../../guards/ProjectGuardService.js';
import { wrapWithProjectGuard } from './wrapWithProjectGuard.js';
import { ProjectAccessForbiddenError } from '../../errors/ProjectAccessForbiddenError.js';

const mockBacklog: any = {
  getProject: jest.fn(),
};

const mockHandler: any = jest.fn();

describe('wrapWithProjectGuard', () => {
  let guardService: ProjectGuardService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHandler.mockResolvedValue({ success: true });
    mockBacklog.getProject.mockImplementation(async (key: string | number) => {
      if (key === 'ALLOWED') return { id: 1 };
      if (key === 'DISALLOWED') return { id: 999 };
      if (key === 1) return { id: 1 };
      if (key === 999) return { id: 999 };
      return { id: 2 };
    });
  });

  // --- WRITE GUARD TESTS ---
  describe('Write Guard (on)', () => {
    beforeEach(async () => {
      guardService = new ProjectGuardService(mockBacklog, {
        allowedProjectIds: [1, 2],
        allowedProjectKeys: [],
        writeGuard: 'on',
        readGuard: 'off',
        keyResolveTtlSec: 0,
      } as any);
      await guardService.initialize();
    });

    it('should allow write with an allowed projectId', async () => {
      const wrapped = wrapWithProjectGuard(mockHandler, 'addIssue', guardService, mockBacklog);
      await expect(wrapped({ projectId: 1 })).resolves.toEqual({ success: true });
    });

    it('should block write with a disallowed projectId', async () => {
      const wrapped = wrapWithProjectGuard(mockHandler, 'addIssue', guardService, mockBacklog);
      await expect(wrapped({ projectId: 999 })).rejects.toThrow(ProjectAccessForbiddenError);
    });

    it('should resolve and allow write with an allowed projectKey', async () => {
      const wrapped = wrapWithProjectGuard(mockHandler, 'addIssue', guardService, mockBacklog);
      await expect(wrapped({ projectKey: 'ALLOWED' })).resolves.toEqual({ success: true });
    });

    it('should allow write when projectIds array includes an allowed project', async () => {
      const wrapped = wrapWithProjectGuard(mockHandler, 'addIssue', guardService, mockBacklog);
      const params: any = { projectIds: [999, 1, 888] };
      await expect(wrapped(params)).resolves.toEqual({ success: true });
      expect(params.projectId).toBe(1);
    });

    it('should block write when projectIds array has no allowed projects', async () => {
      const wrapped = wrapWithProjectGuard(mockHandler, 'addIssue', guardService, mockBacklog);
      await expect(wrapped({ projectIds: [999, 888] })).rejects.toThrow(
        ProjectAccessForbiddenError
      );
    });

    it('should use default project ID if none is provided', async () => {
      guardService = new ProjectGuardService(mockBacklog, {
        allowedProjectIds: [1, 2],
        allowedProjectKeys: [],
        writeGuard: 'on',
        readGuard: 'off',
        defaultProjectId: 2,
        keyResolveTtlSec: 0,
      } as any);
      const wrapped = wrapWithProjectGuard(mockHandler, 'addIssue', guardService, mockBacklog);
      const params = {};
      await wrapped(params);
      expect(params).toEqual({ projectId: 2 });
    });
  });

  // --- READ GUARD (deny) TESTS ---
  describe('Read Guard (deny)', () => {
    beforeEach(async () => {
      guardService = new ProjectGuardService(mockBacklog, {
        allowedProjectIds: [1, 2],
        allowedProjectKeys: [],
        writeGuard: 'off',
        readGuard: 'deny',
        keyResolveTtlSec: 0,
      } as any);
      await guardService.initialize();
    });

    it('should deny read from a disallowed project', async () => {
      const wrapped = wrapWithProjectGuard(mockHandler, 'getIssue', guardService, mockBacklog);
      await expect(wrapped({ projectId: 999 })).rejects.toThrow(ProjectAccessForbiddenError);
    });

    it('should throw if no project is specified and multiple are allowed', async () => {
      const wrapped = wrapWithProjectGuard(mockHandler, 'getIssues', guardService, mockBacklog);
      await expect(wrapped({})).rejects.toThrow('Project must be specified');
    });
  });

  // --- READ GUARD (filter) TESTS ---
  describe('Read Guard (filter)', () => {
    beforeEach(async () => {
      guardService = new ProjectGuardService(mockBacklog, {
        allowedProjectIds: [1, 2],
        allowedProjectKeys: [],
        writeGuard: 'off',
        readGuard: 'filter',
        keyResolveTtlSec: 0,
      } as any);
      await guardService.initialize();
    });

    it('should inject all allowed project IDs if none are provided', async () => {
      const wrapped = wrapWithProjectGuard(mockHandler, 'getIssues', guardService, mockBacklog);
      const params = {};
      await wrapped(params);
      expect(params).toEqual({ projectId: [1, 2] });
    });

    it('should filter provided project IDs to only allowed ones', async () => {
      const wrapped = wrapWithProjectGuard(mockHandler, 'getIssues', guardService, mockBacklog);
      const params = { projectId: [1, 999, 2, 888] };
      await wrapped(params);
      expect(params).toEqual({ projectId: [1, 2] });
    });
  });
});
