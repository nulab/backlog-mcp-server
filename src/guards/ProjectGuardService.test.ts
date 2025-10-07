// Copyright (c) 2025 Nulab inc.
// Licensed under the MIT License.

import { jest } from '@jest/globals';
import { Backlog } from 'backlog-js';
import { ProjectGuardService } from './ProjectGuardService.js';
import { logger } from '../utils/logger.js';

const mockBacklog = {
  getProjects: jest.fn(),
  getProject: jest.fn(),
} as unknown as Backlog;

describe('ProjectGuardService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockBacklog.getProjects as jest.Mock).mockResolvedValue([
      { id: 1, projectKey: 'HOME' },
      { id: 2, projectKey: 'TEST-1' },
    ]);
    jest.spyOn(logger, 'warn').mockImplementation(() => {});
  });

  describe('Initialization and Validation', () => {
    it('should initialize with allowed project IDs', async () => {
      const service = new ProjectGuardService(mockBacklog, {
        allowedProjectIds: [123, 456],
        allowedProjectKeys: [],
        writeGuard: 'on',
        readGuard: 'filter',
        keyResolveTtlSec: 300,
      });
      await service.initialize();
      expect(service.getAllowedProjectIds()).toEqual(new Set([123, 456]));
    });

    it('should resolve and add allowed project keys', async () => {
      const service = new ProjectGuardService(mockBacklog, {
        allowedProjectIds: [123],
        allowedProjectKeys: ['HOME'],
        writeGuard: 'on',
        readGuard: 'filter',
        keyResolveTtlSec: 300,
      });
      await service.initialize();
      expect(service.getAllowedProjectIds()).toEqual(new Set([123, 1]));
    });

    it('should throw if a project key cannot be resolved', async () => {
      const service = new ProjectGuardService(mockBacklog, {
        allowedProjectIds: [],
        allowedProjectKeys: ['UNKNOWN'],
        writeGuard: 'on',
        readGuard: 'filter',
        keyResolveTtlSec: 300,
      });
      await expect(service.initialize()).rejects.toThrow(
        'Failed to resolve project key: UNKNOWN'
      );
    });

    it('should throw if guards are on but no projects are allowed', async () => {
      const service = new ProjectGuardService(mockBacklog, {
        allowedProjectIds: [],
        allowedProjectKeys: [],
        writeGuard: 'on',
        readGuard: 'off',
        keyResolveTtlSec: 300,
      });
      await expect(service.initialize()).rejects.toThrow(
        'FATAL: Guards are enabled but no allowed projects are configured.'
      );
    });

    it('should warn in dev if projects are allowed but guards are off', async () => {
      process.env.NODE_ENV = 'development';
      const service = new ProjectGuardService(mockBacklog, {
        allowedProjectIds: [1],
        allowedProjectKeys: [],
        writeGuard: 'off',
        readGuard: 'off',
        keyResolveTtlSec: 300,
      });
      await service.initialize();
      expect(logger.warn).toHaveBeenCalledWith(
        'WARNING: Allowed projects are configured but both read and write guards are off.'
      );
    });

    it('should throw in prod if projects are allowed but guards are off', async () => {
      process.env.NODE_ENV = 'production';
      const service = new ProjectGuardService(mockBacklog, {
        allowedProjectIds: [1],
        allowedProjectKeys: [],
        writeGuard: 'off',
        readGuard: 'off',
        keyResolveTtlSec: 300,
      });
      await expect(service.initialize()).rejects.toThrow(
        'FATAL: WARNING: Allowed projects are configured but both read and write guards are off.'
      );
    });

    it('should throw in prod if fully unguarded without UNGUARDED_OK flag', async () => {
      process.env.NODE_ENV = 'production';
      const service = new ProjectGuardService(mockBacklog, {
        allowedProjectIds: [],
        allowedProjectKeys: [],
        writeGuard: 'off',
        readGuard: 'off',
        keyResolveTtlSec: 300,
      });
      await expect(service.initialize()).rejects.toThrow(
        'FATAL: Running in production without guards requires BACKLOG_UNGUARDED_OK=I_UNDERSTAND_THE_RISKS'
      );
    });

    it('should not throw in prod if fully unguarded with UNGUARDED_OK flag', async () => {
      process.env.NODE_ENV = 'production';
      const service = new ProjectGuardService(mockBacklog, {
        allowedProjectIds: [],
        allowedProjectKeys: [],
        writeGuard: 'off',
        readGuard: 'off',
        unguardedOk: 'I_UNDERSTAND_THE_RISKS',
        keyResolveTtlSec: 300,
      });
      await expect(service.initialize()).resolves.not.toThrow();
    });
  });
});
