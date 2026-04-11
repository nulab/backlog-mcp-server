import { Backlog } from 'backlog-js';
import { ToolsetGroup, Toolset } from '../types/toolsets.js';
import { allTools } from '../tools/tools.js';
import { TranslationHelper } from '../createTranslationHelper.js';

export function getToolset(
  group: ToolsetGroup,
  name: string
): Toolset | undefined {
  return group.toolsets.find((t) => t.name === name);
}

export function enableToolset(group: ToolsetGroup, name: string): string {
  const ts = getToolset(group, name);
  if (!ts) return `Toolset ${name} not found`;
  if (ts.enabled) return `Toolset ${name} is already enabled`;
  ts.enabled = true;
  return `Toolset ${name} enabled`;
}

export function getEnabledTools(group: ToolsetGroup) {
  return group.toolsets.filter((ts) => ts.enabled).flatMap((ts) => ts.tools);
}

export function listAvailableToolsets(group: ToolsetGroup) {
  return group.toolsets.map((ts) => ({
    name: ts.name,
    description: ts.description,
    currentlyEnabled: ts.enabled,
    canEnable: true,
  }));
}

export function listToolsetTools(group: ToolsetGroup, name: string) {
  const ts = getToolset(group, name);
  return (
    ts?.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      toolset: name,
      canEnable: true,
    })) ?? []
  );
}

export const buildToolsetGroup = (
  backlog: Backlog,
  helper: TranslationHelper,
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
