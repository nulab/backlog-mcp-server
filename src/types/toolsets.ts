import { NativeContentToolDefinition, ToolDefinition } from './tool.js';

type BaseToolset<TTool> = {
  name: string;
  description: string;
  enabled: boolean;
  tools: TTool[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Toolset = BaseToolset<ToolDefinition<any, any>> & {
  // Kept apart from `tools`: binary results must bypass field picking and the token limit.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nativeContentTools?: NativeContentToolDefinition<any>[];
};
export type ToolsetGroup = { toolsets: Toolset[] };
