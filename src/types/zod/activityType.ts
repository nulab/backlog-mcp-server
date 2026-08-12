import { z } from 'zod';

/**
 * The activity type ids the Backlog API accepts as a filter.
 *
 * All that is left of backlogOutputDefinition.ts. That file described API
 * responses in parallel with the types backlog-js already ships; tools now take
 * their field names from those types instead. This one is different: it is an
 * input filter, and backlog-js has no enum for it.
 */
export const ActivityTypeSchema = z.nativeEnum({
  Undefined: -1,
  IssueCreated: 1,
  IssueUpdated: 2,
  IssueCommented: 3,
  IssueDeleted: 4,
  WikiCreated: 5,
  WikiUpdated: 6,
  WikiDeleted: 7,
  FileAdded: 8,
  FileUpdated: 9,
  FileDeleted: 10,
  SvnCommitted: 11,
  GitPushed: 12,
  GitRepositoryCreated: 13,
  IssueMultiUpdated: 14,
  ProjectUserAdded: 15,
  ProjectUserRemoved: 16,
  NotifyAdded: 17,
  PullRequestAdded: 18,
  PullRequestUpdated: 19,
  PullRequestCommented: 20,
  PullRequestMerged: 21,
  MilestoneCreated: 22,
  MilestoneUpdated: 23,
  MilestoneDeleted: 24,
  ProjectGroupAdded: 25,
  ProjectGroupDeleted: 26,
});
