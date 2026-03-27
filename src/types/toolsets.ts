import { DynamicToolDefinition, ToolDefinition } from './tool.js';

type BaseToolset<TTool> = {
  name: string;
  description: string;
  enabled: boolean;
  tools: TTool[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Toolset = BaseToolset<ToolDefinition<any, any>>;
export type ToolsetGroup = { toolsets: Toolset[] };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DynamicToolset = BaseToolset<DynamicToolDefinition<any>>;
export type DynamicToolsetGroup = { toolsets: DynamicToolset[] };
