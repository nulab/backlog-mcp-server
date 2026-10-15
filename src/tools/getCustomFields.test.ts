import { vi, describe, it, expect } from 'vite-plus/test';
import { getCustomFields } from 'backlog-js';
import type { Client } from 'backlog-js';
import { getCustomFieldsTool } from './getCustomFields';
import { createDescriptionHelper } from '../createDescriptionHelper';

vi.mock('backlog-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('backlog-js')>()),
  getCustomFields: vi.fn(),
}));

// Derive the custom field definition type from the public backlog-js API instead of
// importing backlog-js internals (deep imports are not exported since 0.17.0).
type CustomField = Awaited<ReturnType<typeof getCustomFields>>[number];

describe('getCustomFieldsTool', () => {
  const mockClient = {} as Client;

  // Use the actual createDescriptionHelper for consistency
  const mockDescriptionHelper = createDescriptionHelper();

  // Instantiate the tool with the mock client and real DescriptionHelper
  const tool = getCustomFieldsTool(mockClient, mockDescriptionHelper);
  const toolHandler = tool.handler; // Get the handler from the instantiated tool

  it('should return custom fields for a valid project ID', async () => {
    const mockCustomFieldsData: CustomField[] = [
      {
        id: 1,
        projectId: 1,
        typeId: 1,
        name: 'CF1',
        description: '',
        required: false,
        useIssueType: false,
        applicableIssueTypes: [],
        displayOrder: 0,
        version: 1,
      } as CustomField,
      {
        id: 2,
        projectId: 1,
        typeId: 2,
        name: 'CF2',
        description: 'Desc',
        required: true,
        useIssueType: false,
        applicableIssueTypes: [1],
        displayOrder: 1,
        version: 1,
      } as CustomField,
    ];

    // Setup the mockResolvedValue for getCustomFields
    vi.mocked(getCustomFields).mockResolvedValue(mockCustomFieldsData);

    const input = { projectKey: 'TEST_PROJECT' };
    const result = await toolHandler(input);

    expect(getCustomFields).toHaveBeenCalledWith(mockClient, 'TEST_PROJECT');
    expect(result).toEqual(mockCustomFieldsData);
  });

  it('should call getCustomFields with correct params when using project ID', async () => {
    vi.mocked(getCustomFields).mockResolvedValue([]); // Return empty for this check
    await toolHandler({ projectId: 123 });
    expect(getCustomFields).toHaveBeenCalledWith(mockClient, 123);
  });

  it('should throw an error if getCustomFields fails', async () => {
    const apiError = new Error('API error');
    vi.mocked(getCustomFields).mockRejectedValue(apiError);

    const input = { projectKey: 'TEST_PROJECT_FAIL' };
    // Expect the handler to throw the error directly
    await expect(toolHandler(input)).rejects.toThrow(apiError);
    expect(getCustomFields).toHaveBeenCalledWith(
      mockClient,
      'TEST_PROJECT_FAIL'
    );
  });

  it('should throw a structured error if API returns structured error', async () => {
    const structuredError = {
      message: 'Structured error from API', // This is the top-level message
      errors: [
        { message: 'Invalid request detail', code: 6, moreInfo: 'Some info' },
      ],
    };
    vi.mocked(getCustomFields).mockRejectedValue(structuredError);

    const input = { projectKey: 'TEST_PROJECT_STRUCTURED_ERROR' };
    // Expect the handler to throw the structured error directly
    await expect(toolHandler(input)).rejects.toEqual(structuredError);
    expect(getCustomFields).toHaveBeenCalledWith(
      mockClient,
      'TEST_PROJECT_STRUCTURED_ERROR'
    );
  });

  it('throws an error if neither projectId nor projectKey is provided', async () => {
    const params = {}; // No identifier provided

    await expect(toolHandler(params as any)).rejects.toThrow(Error);
  });
});
