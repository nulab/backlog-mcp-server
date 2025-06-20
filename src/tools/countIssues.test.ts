import { countIssuesTool } from "./countIssues.js";
import { jest, describe, it, expect } from '@jest/globals'; 
import type { Backlog } from "backlog-js";
import { createTranslationHelper } from "../createTranslationHelper.js";

describe("countIssuesTool", () => {
  const mockBacklog: Partial<Backlog> = {
    getIssuesCount: jest.fn<() => Promise<any>>().mockResolvedValue({
      count: 42
    })
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = countIssuesTool(mockBacklog as Backlog, mockTranslationHelper);

  it("returns issue count", async () => {
    const result = await tool.handler({
      projectId: [100]
    });

    expect(result).toHaveProperty("count", 42);
  });

  it("calls backlog.getIssuesCount with correct params", async () => {
    const params = {
      projectId: [100],
      statusId: [1],
      keyword: "bug"
    };
    
    await tool.handler(params);
    
    expect(mockBacklog.getIssuesCount).toHaveBeenCalledWith(params);
  });

  it("calls backlog.getIssuesCount with date filters", async () => {
    await tool.handler({
      createdSince: "2023-01-01",
      createdUntil: "2023-01-31"
    });
    
    expect(mockBacklog.getIssuesCount).toHaveBeenCalledWith({
      createdSince: "2023-01-01",
      createdUntil: "2023-01-31"
    });
  });

  it("calls backlog.getIssuesCount with custom fields", async () => {
    await tool.handler({
      projectId: [100],
      customFields: [
        { id: 12345, value: "test-value" },
        { id: 67890, value: 123 }
      ]
    });
    
    expect(mockBacklog.getIssuesCount).toHaveBeenCalledWith({
      projectId: [100],
      customField_12345: "test-value",
      customField_67890: 123
    });
  });

  it("calls backlog.getIssuesCount with custom fields array values", async () => {
    await tool.handler({
      customFields: [
        { id: 11111, value: ["option1", "option2"] }
      ]
    });
    
    expect(mockBacklog.getIssuesCount).toHaveBeenCalledWith({
      customField_11111: ["option1", "option2"]
    });
  });

  it("calls backlog.getIssuesCount with empty custom fields", async () => {
    await tool.handler({
      projectId: [100],
      customFields: []
    });
    
    expect(mockBacklog.getIssuesCount).toHaveBeenCalledWith({
      projectId: [100]
    });
  });

  it("calls backlog.getIssuesCount without custom fields", async () => {
    await tool.handler({
      projectId: [100],
      statusId: [1]
    });
    
    expect(mockBacklog.getIssuesCount).toHaveBeenCalledWith({
      projectId: [100],
      statusId: [1]
    });
  });
});
