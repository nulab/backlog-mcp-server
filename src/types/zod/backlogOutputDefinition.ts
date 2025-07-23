import { z } from 'zod';

export const TextFormattingRuleSchema = z.enum(['backlog', 'markdown']);

export const RoleTypeSchema = z.union([
  z.nativeEnum({
    Admin: 1,
    User: 2,
    Reporter: 3,
    Viewer: 4,
    GuestReporter: 5,
    GuestViewer: 6,
  }),
  z.nativeEnum({
    Admin: 1,
    MemberOrGuest: 2,
    MemberOrGuestForAddIssues: 3,
    MemberOrGuestForViewIssues: 4,
  }),
]);

export const LanguageSchema = z.union([
  z.literal('en'),
  z.literal('ja'),
  z.null(),
]);

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

export const IssueTypeColorSchema = z.enum([
  '#e30000',
  '#990000',
  '#934981',
  '#814fbc',
  '#2779ca',
  '#007e9a',
  '#7ea800',
  '#ff9200',
  '#ff3265',
  '#666665',
]);

export const ProjectStatusColorSchema = z.enum([
  '#ea2c00',
  '#e87758',
  '#e07b9a',
  '#868cb7',
  '#3b9dbd',
  '#4caf93',
  '#b0be3c',
  '#eda62a',
  '#f42858',
  '#393939',
]);

export const CustomFieldTypeSchema = z.nativeEnum({
  Text: 1,
  TextArea: 2,
  Numeric: 3,
  Date: 4,
  SingleList: 5,
  MultipleList: 6,
  CheckBox: 7,
  Radio: 8,
});

export const WebhookActivityIdSchema = z.number();

export const UserSchema = z.object({
  id: z.number(),
  userId: z.string(),
  name: z.string(),
  roleType: RoleTypeSchema,
  lang: LanguageSchema,
  mailAddress: z.string(),
  lastLoginTime: z.string(),
});
export const ProjectStatusSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  name: z.string(),
  color: ProjectStatusColorSchema,
  displayOrder: z.number(),
});

export const CategorySchema = z.object({
  id: z.number(),
  projectId: z.number(),
  name: z.string(),
  displayOrder: z.number(),
});

export const IssueFileInfoSchema = z.object({
  id: z.number(),
  name: z.string(),
  size: z.number(),
  createdUser: UserSchema,
  created: z.string(),
});

export const StarSchema = z.object({
  id: z.number(),
  comment: z.string().optional(),
  url: z.string(),
  title: z.string(),
  presenter: UserSchema,
  created: z.string(),
});

export const IssueTypeSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  name: z.string(),
  color: IssueTypeColorSchema,
  displayOrder: z.number(),
  templateSummary: z.string().optional(),
  templateDescription: z.string().optional(),
});

export const ResolutionSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export const PrioritySchema = z.object({
  id: z.number(),
  name: z.string(),
});

export const VersionSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  name: z.string(),
  description: z.string().optional(),
  startDate: z.string().optional(),
  releaseDueDate: z.string().optional(),
  archived: z.boolean(),
  displayOrder: z.number(),
});

export const CustomFieldSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  typeId: CustomFieldTypeSchema,
  name: z.string(),
  description: z.string(),
  required: z.boolean(),
  applicableIssueTypes: z.array(z.number()),
});

export const SharedFileSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  type: z.string(),
  dir: z.string(),
  name: z.string(),
  size: z.number(),
  createdUser: UserSchema,
  created: z.string(),
  updatedUser: UserSchema,
  updated: z.string(),
});

export const IssueSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  issueKey: z.string(),
  keyId: z.number(),
  issueType: IssueTypeSchema,
  summary: z.string(),
  description: z.string(),
  resolution: ResolutionSchema.optional(),
  priority: PrioritySchema,
  status: ProjectStatusSchema,
  assignee: UserSchema.optional(),
  category: z.array(CategorySchema),
  versions: z.array(VersionSchema),
  milestone: z.array(VersionSchema),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  estimatedHours: z.number().optional(),
  actualHours: z.number().optional(),
  parentIssueId: z.number().optional(),
  createdUser: UserSchema,
  created: z.string(),
  updatedUser: UserSchema,
  updated: z.string(),
  customFields: z.array(CustomFieldSchema),
  attachments: z.array(IssueFileInfoSchema),
  sharedFiles: z.array(SharedFileSchema),
  stars: z.array(StarSchema),
});

export const ProjectSchema = z.object({
  id: z.number(),
  projectKey: z.string(),
  name: z.string(),
  chartEnabled: z.boolean(),
  useResolvedForChart: z.boolean(),
  subtaskingEnabled: z.boolean(),
  projectLeaderCanEditProjectLeader: z.boolean(),
  useWiki: z.boolean(),
  useFileSharing: z.boolean(),
  useWikiTreeView: z.boolean(),
  useOriginalImageSizeAtWiki: z.boolean(),
  useSubversion: z.boolean(),
  useGit: z.boolean(),
  textFormattingRule: TextFormattingRuleSchema,
  archived: z.boolean(),
  displayOrder: z.number(),
  useDevAttributes: z.boolean(),
});

export const AttachmentInfoSchema = z.object({
  id: z.number(),
  type: z.string(),
});
export const AttributeInfoSchema = z.object({
  id: z.number(),
  typeId: z.number(),
});

export const NotificationInfoSchema = z.object({
  type: z.string(),
});

export const IssueChangeLogSchema = z.object({
  field: z.string(),
  newValue: z.string(),
  originalValue: z.string(),
  attachmentInfo: AttachmentInfoSchema,
  attributeInfo: AttributeInfoSchema,
  notificationInfo: NotificationInfoSchema,
});

export const CommentNotificationSchema = z.object({
  id: z.number(),
  alreadyRead: z.boolean(),
  reason: z.number(),
  user: UserSchema,
  resourceAlreadyRead: z.boolean(),
});

export const IssueCommentSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  issueId: z.number(),
  content: z.string(),
  changeLog: z.array(IssueChangeLogSchema),
  createdUser: UserSchema,
  created: z.string(),
  updated: z.string(),
  stars: z.array(StarSchema),
  notifications: z.array(CommentNotificationSchema),
});

export const PullRequestStatusSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export const PullRequestFileInfoSchema = z.object({
  id: z.number(),
  name: z.string(),
  size: z.number(),
  createdUser: UserSchema,
  created: z.string(),
});

export const ChangeLogSchema = z.object({
  field: z.string(),
  newValue: z.string(),
  originalValue: z.string(),
});

export const PullRequestChangeLogSchema = ChangeLogSchema;

export const PullRequestSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  repositoryId: z.number(),
  number: z.number(),
  summary: z.string(),
  description: z.string(),
  base: z.string(),
  branch: z.string(),
  status: PullRequestStatusSchema,
  assignee: UserSchema.optional(),
  issue: IssueSchema,
  baseCommit: z.string().optional(),
  branchCommit: z.string().optional(),
  mergeCommit: z.string().optional(),
  closeAt: z.string().optional(),
  mergeAt: z.string().optional(),
  createdUser: UserSchema,
  created: z.string(),
  updatedUser: UserSchema,
  updated: z.string(),
  attachments: z.array(PullRequestFileInfoSchema),
  stars: z.array(StarSchema),
});

export const PullRequestCommentSchema = z.object({
  id: z.number(),
  content: z.string(),
  changeLog: z.array(PullRequestChangeLogSchema),
  createdUser: UserSchema,
  created: z.string(),
  updated: z.string(),
  stars: z.array(StarSchema),
  notifications: z.array(CommentNotificationSchema),
});

export const WikiFileInfoSchema = z.object({
  id: z.number(),
  name: z.string(),
  size: z.number(),
  createdUser: UserSchema,
  created: z.string(),
});

export const TagSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export const WikiSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  name: z.string(),
  content: z.string(),
  tags: z.array(TagSchema),
  attachments: z.array(WikiFileInfoSchema),
  sharedFiles: z.array(SharedFileSchema),
  stars: z.array(StarSchema),
  createdUser: UserSchema,
  created: z.string(),
  updatedUser: UserSchema,
  updated: z.string(),
});

export const IssueCountSchema = z.object({
  count: z.number(),
});

export const WatchingListItemSchema = z.object({
  id: z.number(),
  resourceAlreadyRead: z.boolean(),
  note: z.string(),
  type: z.string(),
  issue: IssueSchema,
  lastContentUpdated: z.string(),
  created: z.string(),
  updated: z.string(),
});

export const GitRepositorySchema = z.object({
  id: z.number(),
  projectId: z.number(),
  name: z.string(),
  description: z.string(),
  hookUrl: z.string().optional(),
  httpUrl: z.string(),
  sshUrl: z.string(),
  displayOrder: z.number(),
  pushedAt: z.string().optional(),
  createdUser: UserSchema,
  created: z.string(),
  updatedUser: UserSchema,
  updated: z.string(),
});

export const NotificationSchema = z.object({
  id: z.number(),
  alreadyRead: z.boolean(),
  reason: z.number(),
  resourceAlreadyRead: z.boolean(),
  project: ProjectSchema.optional(),
  issue: IssueSchema.optional(),
  comment: IssueCommentSchema.optional(),
  pullRequest: PullRequestSchema.optional(),
  pullRequestComment: PullRequestCommentSchema.optional(),
  sender: UserSchema,
  created: z.string(),
});

export const NotificationCountSchema = z.object({
  count: z.number(),
});

export const PullRequestCountSchema = z.object({
  count: z.number(),
});

export const SpaceSchema = z.object({
  spaceKey: z.string(),
  name: z.string(),
  ownerId: z.number(),
  lang: z.string(),
  timezone: z.string(),
  reportSendTime: z.string(),
  textFormattingRule: TextFormattingRuleSchema,
  created: z.string(),
  updated: z.string(),
});

export const WatchingListCountSchema = z.object({
  count: z.number(),
});

export const WikiListItemSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  name: z.string(),
  tags: z.array(TagSchema),
  createdUser: UserSchema,
  created: z.string(),
  updatedUser: UserSchema,
  updated: z.string(),
});

export const WikiCountSchema = z.object({
  count: z.number(),
});

export const DocumentSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  name: z.string(),
  content: z.string(),
  createdUser: UserSchema,
  created: z.string(),
  updatedUser: UserSchema,
  updated: z.string(),
});

export const DocumentAttachmentSchema = z.object({
  filename: z.string(),
  body: z.any(),
  url: z.string(),
});

export const DocumentTagSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export const DocumentFileInfoSchema = z.object({
  id: z.number(),
  name: z.string(),
  size: z.number(),
  createdUser: UserSchema,
  created: z.string(),
});

export const DocumentItemSchema = z.object({
  id: z.string(),
  projectId: z.number(),
  title: z.string(),
  plain: z.string(),
  json: z.string(),
  statusId: z.number(),
  emoji: z.string().nullable(),
  attachments: z.array(DocumentFileInfoSchema),
  tags: z.array(DocumentTagSchema),
  createdUser: UserSchema,
  created: z.string(),
  updatedUser: UserSchema,
  updated: z.string(),
});

export type DocumentTreeNode = {
  id: string;
  name?: string;
  children: DocumentTreeNode[];
  statusId?: number;
  emoji?: string;
  emojiType?: string;
  updated?: string;
};

export const DocumentTreeNodeSchema: z.ZodType<DocumentTreeNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string().optional(),
    children: z.array(DocumentTreeNodeSchema),
    statusId: z.number().optional(),
    emoji: z.string().optional(),
    emojiType: z.string().optional(),
    updated: z.string().optional(),
  })
);

export const ActiveTrashTreeSchema = z.object({
  id: z.string(),
  children: z.array(DocumentTreeNodeSchema),
});

export const DocumentTreeFullSchema: z.ZodRawShape = {
  projectId: z.number(),
  activeTree: ActiveTrashTreeSchema.optional(),
  trashTree: ActiveTrashTreeSchema.optional(),
};

export const DocumentTreeFullSchemaZ = z.object(DocumentTreeFullSchema);
