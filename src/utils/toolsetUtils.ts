import { Backlog } from 'backlog-js';
import { ToolsetGroup } from '../types/toolsets.js';
import { allTools } from '../tools/tools.js';
import { DescriptionHelper } from '../createDescriptionHelper.js';

export const buildToolsetGroup = (
  backlog: Backlog,
  helper: DescriptionHelper,
  enabledToolsets: string[]
): ToolsetGroup => {
  const toolsetGroup = allTools(backlog, helper);
  const knownNames = toolsetGroup.toolsets.map((ts) => ts.name);
  const unknown = enabledToolsets.filter(
    (name) => name !== 'all' && !knownNames.includes(name)
  );

  if (unknown.length > 0) {
    console.warn(`⚠️ Unknown toolsets: ${unknown.join(', ')}`);
  }

  const allEnabled = enabledToolsets.includes('all');

  return {
    toolsets: toolsetGroup.toolsets.map((ts) => ({
      ...ts,
      enabled: allEnabled || enabledToolsets.includes(ts.name),
    })),
  };
};
