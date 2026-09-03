import { Backlog } from 'backlog-js';
import { DescriptionHelper } from '../createDescriptionHelper.js';
import { ToolsetGroup } from '../types/toolsets.js';
import { addAttachmentTool } from './addAttachment.js';
import { addIssueTool } from './addIssue.js';
import { addIssueCommentTool } from './addIssueComment.js';
import { addProjectTool } from './addProject.js';
import { addPullRequestTool } from './addPullRequest.js';
import { addPullRequestCommentTool } from './addPullRequestComment.js';
import { addWikiTool } from './addWiki.js';
import { updateWikiTool } from './updateWiki.js';
import { countIssuesTool } from './countIssues.js';
import { deleteIssueTool } from './deleteIssue.js';
import { getCategoriesTool } from './getCategories.js';
import { getCustomFieldsTool } from './getCustomFields.js';
import { getGitRepositoriesTool } from './getGitRepositories.js';
import { getGitRepositoryTool } from './getGitRepository.js';
import { getIssueTool } from './getIssue.js';
import { getIssueAttachmentTool } from './getIssueAttachment.js';
import { getIssueCommentsTool } from './getIssueComments.js';
import { getIssuesTool } from './getIssues.js';
import { getRelatedIssuesTool } from './getRelatedIssues.js';
import { addRelatedIssueTool } from './addRelatedIssue.js';
import { removeRelatedIssueTool } from './removeRelatedIssue.js';
import { getIssueTypesTool } from './getIssueTypes.js';
import { getMyselfTool } from './getMyself.js';
import { getNotificationsTool } from './getNotifications.js';
import { getNotificationsCountTool } from './getNotificationsCount.js';
import { getPrioritiesTool } from './getPriorities.js';
import { getProjectTool } from './getProject.js';
import { getProjectListTool } from './getProjectList.js';
import { getProjectUsersTool } from './getProjectUsers.js';
import { getPullRequestTool } from './getPullRequest.js';
import { getPullRequestCommentsTool } from './getPullRequestComments.js';
import { getPullRequestsTool } from './getPullRequests.js';
import { getPullRequestsCountTool } from './getPullRequestsCount.js';
import { getResolutionsTool } from './getResolutions.js';
import { getSpaceTool } from './getSpace.js';
import { getSpaceActivitiesTool } from './getSpaceActivities.js';
import { getUserStarsCountTool } from './getUserStarsCount.js';
import { getUsersTool } from './getUsers.js';
import { getUserRecentUpdatesTool } from './getUserRecentUpdates.js';
import { getWatchingListCountTool } from './getWatchingListCount.js';
import { getWatchingListItemsTool } from './getWatchingListItems.js';
import { addWatchingTool } from './addWatching.js';
import { updateWatchingTool } from './updateWatching.js';
import { deleteWatchingTool } from './deleteWatching.js';
import { markWatchingAsReadTool } from './markWatchingAsRead.js';
import { getWikiTool } from './getWiki.js';
import { getWikiPagesTool } from './getWikiPages.js';
import { getWikisCountTool } from './getWikisCount.js';
import { markNotificationAsReadTool } from './markNotificationAsRead.js';
import { resetUnreadNotificationCountTool } from './resetUnreadNotificationCount.js';
import { updateIssueTool } from './updateIssue.js';
import { updateIssueCommentTool } from './updateIssueComment.js';
import { updateProjectTool } from './updateProject.js';
import { updatePullRequestTool } from './updatePullRequest.js';
import { updatePullRequestCommentTool } from './updatePullRequestComment.js';
import { getDocumentTool } from './getDocument.js';
import { getDocumentsTool } from './getDocuments.js';
import { getDocumentTreeTool } from './getDocumentTree.js';
import { getVersionMilestoneListTool } from './getVersionMilestoneList.js';
import { addVersionMilestoneTool } from './addVersionMilestone.js';
import { updateVersionMilestoneTool } from './updateVersionMilestone.js';
import { deleteVersionTool } from './deleteVersion.js';
import { addDocumentTool } from './addDocument.js';

export const allTools = (
  backlog: Backlog,
  helper: DescriptionHelper
): ToolsetGroup => {
  return {
    toolsets: [
      {
        name: 'space',
        description:
          'Tools for managing Backlog space settings and general information.',
        enabled: false,
        tools: [
          getSpaceTool(backlog, helper),
          getSpaceActivitiesTool(backlog, helper),
          getUsersTool(backlog, helper),
          getUserStarsCountTool(backlog, helper),
          getMyselfTool(backlog, helper),
          getUserRecentUpdatesTool(backlog, helper),
          addAttachmentTool(backlog, helper),
        ],
      },
      {
        name: 'project',
        description:
          'Tools for managing projects, categories, custom fields, and issue types.',
        enabled: false,
        tools: [
          getProjectListTool(backlog, helper),
          addProjectTool(backlog, helper),
          getProjectTool(backlog, helper),
          getProjectUsersTool(backlog, helper),
          updateProjectTool(backlog, helper),
        ],
      },
      {
        name: 'issue',
        description: 'Tools for managing issues and their comments.',
        enabled: false,
        nativeContentTools: [getIssueAttachmentTool(backlog, helper)],
        tools: [
          getIssueTool(backlog, helper),
          getIssuesTool(backlog, helper),
          countIssuesTool(backlog, helper),
          addIssueTool(backlog, helper),
          updateIssueTool(backlog, helper),
          deleteIssueTool(backlog, helper),
          getIssueCommentsTool(backlog, helper),
          addIssueCommentTool(backlog, helper),
          updateIssueCommentTool(backlog, helper),
          getRelatedIssuesTool(backlog, helper),
          addRelatedIssueTool(backlog, helper),
          removeRelatedIssueTool(backlog, helper),
          getPrioritiesTool(backlog, helper),
          getCategoriesTool(backlog, helper),
          getCustomFieldsTool(backlog, helper),
          getIssueTypesTool(backlog, helper),
          getResolutionsTool(backlog, helper),
          getWatchingListItemsTool(backlog, helper),
          getWatchingListCountTool(backlog, helper),
          addWatchingTool(backlog, helper),
          updateWatchingTool(backlog, helper),
          deleteWatchingTool(backlog, helper),
          markWatchingAsReadTool(backlog, helper),
          getVersionMilestoneListTool(backlog, helper),
          addVersionMilestoneTool(backlog, helper),
          updateVersionMilestoneTool(backlog, helper),
          deleteVersionTool(backlog, helper),
        ],
      },
      {
        name: 'wiki',
        description: 'Tools for managing wiki pages.',
        enabled: false,
        tools: [
          getWikiPagesTool(backlog, helper),
          getWikisCountTool(backlog, helper),
          getWikiTool(backlog, helper),
          addWikiTool(backlog, helper),
          updateWikiTool(backlog, helper),
        ],
      },
      {
        name: 'git',
        description: 'Tools for managing Git repositories and pull requests.',
        enabled: false,
        tools: [
          getGitRepositoriesTool(backlog, helper),
          getGitRepositoryTool(backlog, helper),
          getPullRequestsTool(backlog, helper),
          getPullRequestsCountTool(backlog, helper),
          getPullRequestTool(backlog, helper),
          addPullRequestTool(backlog, helper),
          updatePullRequestTool(backlog, helper),
          getPullRequestCommentsTool(backlog, helper),
          addPullRequestCommentTool(backlog, helper),
          updatePullRequestCommentTool(backlog, helper),
        ],
      },
      {
        name: 'document',
        description: 'Tools for managing documents.',
        enabled: false,
        tools: [
          getDocumentsTool(backlog, helper),
          getDocumentTreeTool(backlog, helper),
          getDocumentTool(backlog, helper),
          addDocumentTool(backlog, helper),
        ],
      },
      {
        name: 'notifications',
        description: 'Tools for managing user notifications.',
        enabled: false,
        tools: [
          getNotificationsTool(backlog, helper),
          getNotificationsCountTool(backlog, helper),
          resetUnreadNotificationCountTool(backlog, helper),
          markNotificationAsReadTool(backlog, helper),
        ],
      },
    ],
  };
};
