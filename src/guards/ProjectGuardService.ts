import { Backlog } from 'backlog-js';

type ProjectGuardConfig = {
  allowedProjectIds: (string | number)[];
  allowedProjectKeys: string[];
  keyResolveTtlSec: number;
};

export class ProjectGuardService {
  private readonly allowedProjectIds = new Set<number>();
  private readonly allowedProjectKeys = new Set<string>();
  private readonly config: ProjectGuardConfig;
  private readonly backlog: Backlog;

  constructor(backlog: Backlog, config: ProjectGuardConfig) {
    this.backlog = backlog;
    this.config = config;
  }

  async initialize(): Promise<void> {
    this.config.allowedProjectIds.forEach((id) => {
      const numericId = Number(id);
      if (!isNaN(numericId)) {
        this.allowedProjectIds.add(numericId);
      }
    });

    if (this.config.allowedProjectKeys.length > 0) {
      // Todo: add TTL caching and try catch errors
      const projects = await this.backlog.getProjects();
      const projectMap = new Map<string, number>();
      projects.forEach((p: any) => projectMap.set(p.projectKey, p.id));

      for (const key of this.config.allowedProjectKeys) {
        const id = projectMap.get(key);
        if (id) {
          this.allowedProjectKeys.add(key);
          this.allowedProjectIds.add(id);
        } else {
          throw new Error(`Failed to resolve project key: ${key}`);
        }
      }
    }
  }

  public isAllowed(projectId: number): boolean;
  public isAllowed(projectKey: string): boolean;
  public isAllowed(project: number | string): boolean {
    if (typeof project === 'number') {
      return (
        this.allowedProjectIds.size === 0 || this.allowedProjectIds.has(project)
      );
    }

    if (typeof project === 'string') {
      if (this.allowedProjectIds.size === 0) {
        return true;
      }
      return this.allowedProjectKeys.has(project);
    }

    return false;
  }

  public getAllowedProjectIds(): Set<number> {
    return this.allowedProjectIds;
  }
}
