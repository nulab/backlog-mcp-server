import { NativeContentToolDefinition, ToolDefinition } from './tool.js';

type BaseToolset<TTool> = {
  name: string;
  description: string;
  enabled: boolean;
  tools: TTool[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Toolset = BaseToolset<ToolDefinition<any, any>> & {
  /**
   * Tools of this toolset that build their own `CallToolResult`.
   *
   * A separate field rather than a member of `tools`, because the two are
   * registered through different pipelines: a `ToolDefinition` is reshaped by
   * field picking and the token limit, which a tool returning binary content
   * must not be. Keeping them in one toolset is what makes `--enable-toolsets`
   * and the prefix apply to both.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nativeContentTools?: NativeContentToolDefinition<any>[];
};
export type ToolsetGroup = { toolsets: Toolset[] };
