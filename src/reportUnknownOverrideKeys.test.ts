import { Backlog } from 'backlog-js';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { reportUnknownOverrideKeys } from './reportUnknownOverrideKeys';
import type { BacklogClientRegistry } from './utils/backlogClientRegistry';
import { logger } from './utils/logger';

describe('reportUnknownOverrideKeys', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  // Tool definitions only touch the client inside their handlers, so building
  // the probe never calls it.
  const args = {
    version: '0.0.0-test',
    backlog: {} as Backlog,
    clientRegistry: {} as BacklogClientRegistry,
    mcpOption: {
      useFields: false,
      maxTokens: 50000,
      prefix: '',
      useOrganization: false,
    },
  };

  beforeEach(() => {
    errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('says nothing when there are no overrides', () => {
    reportUnknownOverrideKeys({ ...args, overrides: {} });

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('says nothing when every key matches a tool or parameter', () => {
    reportUnknownOverrideKeys({
      ...args,
      overrides: {
        TOOL_GET_SPACE_DESCRIPTION: 'Custom',
        TOOL_GET_ISSUE_ISSUE_ID: 'Custom',
      },
    });

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('reports a key that matches nothing', () => {
    reportUnknownOverrideKeys({
      ...args,
      overrides: {
        TOOL_GET_SPACE_DESCRIPTION: 'Custom',
        TOOL_THAT_WAS_RENAMED_DESCRIPTION: 'Custom',
      },
    });

    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy.mock.calls[0]?.[0]).toEqual({
      keys: ['TOOL_THAT_WAS_RENAMED_DESCRIPTION'],
    });
  });

  it('reports a key written in the wrong case, which never matches either', () => {
    reportUnknownOverrideKeys({
      ...args,
      overrides: { tool_get_space_description: 'Custom' },
    });

    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy.mock.calls[0]?.[0]).toEqual({
      keys: ['tool_get_space_description'],
    });
  });

  it('accepts keys the real server does not publish', () => {
    // The probe enables every toolset and forces multi-organization on purpose:
    // a key belonging to a toolset this process has disabled, or to
    // list_organizations on a single-organization setup, is still a valid key,
    // and reporting it would be a false alarm.
    reportUnknownOverrideKeys({
      ...args,
      overrides: {
        TOOL_GET_WIKI_DESCRIPTION: 'Custom',
        TOOL_LIST_ORGANIZATIONS_DESCRIPTION: 'Custom',
      },
    });

    expect(errorSpy).not.toHaveBeenCalled();
  });
});
