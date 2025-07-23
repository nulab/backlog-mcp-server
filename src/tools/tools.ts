import { Backlog } from 'backlog-js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { ToolsetGroup } from '../types/toolsets.js';
import { addIssueTool } from './addIssue.js';
import { addIssueCommentTool } from './addIssueComment.js';
import { addProjectTool } from './addProject.js';
import { addPullRequestTool } from './addPullRequest.js';
import { addPullRequestCommentTool } from './addPullRequestComment.js';
import { addWikiTool } from './addWiki.js';
import { countIssuesTool } from './countIssues.js';
import { deleteIssueTool } from './deleteIssue.js';
import { deleteProjectTool } from './deleteProject.js';
import { getCategoriesTool } from './getCategories.js';
import { getCustomFieldsTool } from './getCustomFields.js';
import { getGitRepositoriesTool } from './getGitRepositories.js';
import { getGitRepositoryTool } from './getGitRepository.js';
import { getIssueTool } from './getIssue.js';
import { getIssueCommentsTool } from './getIssueComments.js';
import { getIssuesTool } from './getIssues.js';
import { getIssueTypesTool } from './getIssueTypes.js';
import { getMyselfTool } from './getMyself.js';
import { getNotificationsTool } from './getNotifications.js';
import { getNotificationsCountTool } from './getNotificationsCount.js';
import { getPrioritiesTool } from './getPriorities.js';
import { getProjectTool } from './getProject.js';
import { getProjectListTool } from './getProjectList.js';
import { getPullRequestTool } from './getPullRequest.js';
import { getPullRequestCommentsTool } from './getPullRequestComments.js';
import { getPullRequestsTool } from './getPullRequests.js';
import { getPullRequestsCountTool } from './getPullRequestsCount.js';
import { getResolutionsTool } from './getResolutions.js';
import { getSpaceTool } from './getSpace.js';
import { getUsersTool } from './getUsers.js';
import { getWatchingListCountTool } from './getWatchingListCount.js';
import { getWatchingListItemsTool } from './getWatchingListItems.js';
import { getWikiTool } from './getWiki.js';
import { getWikiPagesTool } from './getWikiPages.js';
import { getWikisCountTool } from './getWikisCount.js';
import { markNotificationAsReadTool } from './markNotificationAsRead.js';
import { resetUnreadNotificationCountTool } from './resetUnreadNotificationCount.js';
import { updateIssueTool } from './updateIssue.js';
import { updateProjectTool } from './updateProject.js';
import { updatePullRequestTool } from './updatePullRequest.js';
import { updatePullRequestCommentTool } from './updatePullRequestComment.js';
import { getDocumentTool } from './getDocument.js';
import { getDocumentsTool } from './getDocuments.js';
import { getDocumentTreeTool } from './getDocumentTree.js';

export const allTools = (
  backlog: Backlog,
  helper: TranslationHelper
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
          getUsersTool(backlog, helper),
          getMyselfTool(backlog, helper),
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
          updateProjectTool(backlog, helper),
          deleteProjectTool(backlog, helper),
        ],
      },
      {
        name: 'issue',
        description: 'Tools for managing issues and their comments.',
        enabled: false,
        tools: [
          getIssueTool(backlog, helper),
          getIssuesTool(backlog, helper),
          countIssuesTool(backlog, helper),
          addIssueTool(backlog, helper),
          updateIssueTool(backlog, helper),
          deleteIssueTool(backlog, helper),
          getIssueCommentsTool(backlog, helper),
          addIssueCommentTool(backlog, helper),
          getPrioritiesTool(backlog, helper),
          getCategoriesTool(backlog, helper),
          getCustomFieldsTool(backlog, helper),
          getIssueTypesTool(backlog, helper),
          getResolutionsTool(backlog, helper),
          getWatchingListItemsTool(backlog, helper),
          getWatchingListCountTool(backlog, helper),
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
