export type MCPOptions = {
  useFields: boolean;
  maxTokens: number;
  prefix: string;
  /**
   * Whether tools take an `organization` parameter. Only true when more than one
   * Backlog space is configured; see `BacklogClientRegistry.isMultiOrganization`.
   */
  useOrganization: boolean;
};
