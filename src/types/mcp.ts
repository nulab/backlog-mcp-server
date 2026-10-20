export type MCPOptions = {
  useFields: boolean;
  maxTokens: number;
  prefix: string;
  // True only when more than one Backlog space is configured.
  useOrganization: boolean;
};
