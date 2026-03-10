# Backlog API Coverage

Legend: ✅ = Implemented　❌ = Not implemented

---

## Space

| API                       | Endpoint                       | Status                  |
| ------------------------- | ------------------------------ | ----------------------- |
| Get Space                 | GET /api/v2/space              | ✅ `getSpace`           |
| Get Recent Updates        | GET /api/v2/space/activities   | ✅ `getSpaceActivities` |
| Get Space Logo            | GET /api/v2/space/image        | ❌                      |
| Get Space Notification    | GET /api/v2/space/notification | ❌                      |
| Update Space Notification | PUT /api/v2/space/notification | ❌                      |
| Get Space Disk Usage      | GET /api/v2/space/diskUsage    | ❌                      |
| Post Attachment File      | POST /api/v2/space/attachment  | ❌                      |

---

## Users

| API                          | Endpoint                                        | Status         |
| ---------------------------- | ----------------------------------------------- | -------------- |
| Get User List                | GET /api/v2/users                               | ✅ `getUsers`  |
| Get User                     | GET /api/v2/users/:userId                       | ❌             |
| Add User                     | POST /api/v2/users                              | ❌             |
| Update User                  | PATCH /api/v2/users/:userId                     | ❌             |
| Delete User                  | DELETE /api/v2/users/:userId                    | ❌             |
| Get Own User                 | GET /api/v2/users/myself                        | ✅ `getMyself` |
| Get User Icon                | GET /api/v2/users/:userId/icon                  | ❌             |
| Get User Recent Updates      | GET /api/v2/users/:userId/activities            | ❌             |
| Get Received Star List       | GET /api/v2/users/:userId/stars                 | ❌             |
| Count User Received Stars    | GET /api/v2/users/:userId/stars/count           | ❌             |
| Get Recently Viewed Issues   | GET /api/v2/users/myself/recentlyViewedIssues   | ❌             |
| Get Recently Viewed Projects | GET /api/v2/users/myself/recentlyViewedProjects | ❌             |
| Get Recently Viewed Wikis    | GET /api/v2/users/myself/recentlyViewedWikis    | ❌             |

---

## Statuses / Resolutions / Priorities

| API                 | Endpoint                | Status              |
| ------------------- | ----------------------- | ------------------- |
| Get Resolution List | GET /api/v2/resolutions | ✅ `getResolutions` |
| Get Priority List   | GET /api/v2/priorities  | ✅ `getPriorities`  |

---

## Projects

| API                                | Endpoint                                                           | Status                       |
| ---------------------------------- | ------------------------------------------------------------------ | ---------------------------- |
| Get Project List                   | GET /api/v2/projects                                               | ✅ `getProjectList`          |
| Add Project                        | POST /api/v2/projects                                              | ✅ `addProject`              |
| Get Project                        | GET /api/v2/projects/:projectIdOrKey                               | ✅ `getProject`              |
| Update Project                     | PATCH /api/v2/projects/:projectIdOrKey                             | ✅ `updateProject`           |
| Delete Project                     | DELETE /api/v2/projects/:projectIdOrKey                            | ✅ `deleteProject`           |
| Get Project Icon                   | GET /api/v2/projects/:projectIdOrKey/image                         | ❌                           |
| Get Project Recent Updates         | GET /api/v2/projects/:projectIdOrKey/activities                    | ❌                           |
| Add Project User                   | POST /api/v2/projects/:projectIdOrKey/users                        | ❌                           |
| Get Project User List              | GET /api/v2/projects/:projectIdOrKey/users                         | ❌                           |
| Delete Project User                | DELETE /api/v2/projects/:projectIdOrKey/users                      | ❌                           |
| Add Project Administrator          | POST /api/v2/projects/:projectIdOrKey/administrators               | ❌                           |
| Get List of Project Administrators | GET /api/v2/projects/:projectIdOrKey/administrators                | ❌                           |
| Delete Project Administrator       | DELETE /api/v2/projects/:projectIdOrKey/administrators             | ❌                           |
| Add Status                         | POST /api/v2/projects/:projectIdOrKey/statuses                     | ❌                           |
| Update Status                      | PATCH /api/v2/projects/:projectIdOrKey/statuses/:id                | ❌                           |
| Delete Status                      | DELETE /api/v2/projects/:projectIdOrKey/statuses/:id               | ❌                           |
| Update Order of Status             | PATCH /api/v2/projects/:projectIdOrKey/statuses/updateDisplayOrder | ❌                           |
| Get Issue Type List                | GET /api/v2/projects/:projectIdOrKey/issueTypes                    | ✅ `getIssueTypes`           |
| Add Issue Type                     | POST /api/v2/projects/:projectIdOrKey/issueTypes                   | ❌                           |
| Update Issue Type                  | PATCH /api/v2/projects/:projectIdOrKey/issueTypes/:id              | ❌                           |
| Delete Issue Type                  | DELETE /api/v2/projects/:projectIdOrKey/issueTypes/:id             | ❌                           |
| Get Category List                  | GET /api/v2/projects/:projectIdOrKey/categories                    | ✅ `getCategories`           |
| Add Category                       | POST /api/v2/projects/:projectIdOrKey/categories                   | ❌                           |
| Update Category                    | PATCH /api/v2/projects/:projectIdOrKey/categories/:id              | ❌                           |
| Delete Category                    | DELETE /api/v2/projects/:projectIdOrKey/categories/:id             | ❌                           |
| Get Version/Milestone List         | GET /api/v2/projects/:projectIdOrKey/versions                      | ✅ `getVersionMilestoneList` |
| Add Version/Milestone              | POST /api/v2/projects/:projectIdOrKey/versions                     | ✅ `addVersionMilestone`     |
| Update Version/Milestone           | PATCH /api/v2/projects/:projectIdOrKey/versions/:id                | ✅ `updateVersionMilestone`  |
| Delete Version                     | DELETE /api/v2/projects/:projectIdOrKey/versions/:id               | ✅ `deleteVersion`           |
| Get Custom Field List              | GET /api/v2/projects/:projectIdOrKey/customFields                  | ✅ `getCustomFields`         |
| Add Custom Field                   | POST /api/v2/projects/:projectIdOrKey/customFields                 | ❌                           |
| Update Custom Field                | PATCH /api/v2/projects/:projectIdOrKey/customFields/:id            | ❌                           |
| Delete Custom Field                | DELETE /api/v2/projects/:projectIdOrKey/customFields/:id           | ❌                           |
| Add List Item for Custom Field     | POST .../customFields/:id/items                                    | ❌                           |
| Update List Item for Custom Field  | PATCH .../customFields/:id/items/:itemId                           | ❌                           |
| Delete List Item for Custom Field  | DELETE .../customFields/:id/items/:itemId                          | ❌                           |
| Get List of Shared Files           | GET /api/v2/projects/:projectIdOrKey/files/metadata/:path          | ❌                           |
| Get File                           | GET /api/v2/projects/:projectIdOrKey/files/:sharedFileId           | ❌                           |
| Get Project Disk Usage             | GET /api/v2/projects/:projectIdOrKey/diskUsage                     | ❌                           |
| Get List of Webhooks               | GET /api/v2/projects/:projectIdOrKey/webhooks                      | ❌                           |
| Add Webhook                        | POST /api/v2/projects/:projectIdOrKey/webhooks                     | ❌                           |
| Get Webhook                        | GET /api/v2/projects/:projectIdOrKey/webhooks/:webhookId           | ❌                           |
| Update Webhook                     | PATCH /api/v2/projects/:projectIdOrKey/webhooks/:webhookId         | ❌                           |
| Delete Webhook                     | DELETE /api/v2/projects/:projectIdOrKey/webhooks/:webhookId        | ❌                           |

---

## Issues

| API                               | Endpoint                                                  | Status                |
| --------------------------------- | --------------------------------------------------------- | --------------------- |
| Get Issue List                    | GET /api/v2/issues                                        | ✅ `getIssues`        |
| Count Issue                       | GET /api/v2/issues/count                                  | ✅ `countIssues`      |
| Add Issue                         | POST /api/v2/issues                                       | ✅ `addIssue`         |
| Get Issue                         | GET /api/v2/issues/:issueIdOrKey                          | ✅ `getIssue`         |
| Update Issue                      | PATCH /api/v2/issues/:issueIdOrKey                        | ✅ `updateIssue`      |
| Delete Issue                      | DELETE /api/v2/issues/:issueIdOrKey                       | ✅ `deleteIssue`      |
| Get Comment List                  | GET /api/v2/issues/:issueIdOrKey/comments                 | ✅ `getIssueComments` |
| Add Comment                       | POST /api/v2/issues/:issueIdOrKey/comments                | ✅ `addIssueComment`  |
| Count Comment                     | GET /api/v2/issues/:issueIdOrKey/comments/count           | ❌                    |
| Get Comment                       | GET /api/v2/issues/:issueIdOrKey/comments/:commentId      | ❌                    |
| Delete Comment                    | DELETE /api/v2/issues/:issueIdOrKey/comments/:commentId   | ❌                    |
| Update Comment                    | PATCH /api/v2/issues/:issueIdOrKey/comments/:commentId    | ❌                    |
| Get List of Comment Notifications | GET .../comments/:commentId/notifications                 | ❌                    |
| Add Comment Notification          | POST .../comments/:commentId/notifications                | ❌                    |
| Get List of Issue Attachments     | GET .../issues/:issueIdOrKey/attachments                  | ❌                    |
| Get Issue Attachment              | GET .../issues/:issueIdOrKey/attachments/:attachmentId    | ❌                    |
| Delete Issue Attachment           | DELETE .../issues/:issueIdOrKey/attachments/:attachmentId | ❌                    |
| Get Issue Participant List        | GET .../issues/:issueIdOrKey/participants                 | ❌                    |
| Get List of Linked Shared Files   | GET .../issues/:issueIdOrKey/sharedFiles                  | ❌                    |
| Link Shared Files to Issue        | POST .../issues/:issueIdOrKey/sharedFiles                 | ❌                    |
| Remove Link to Shared File        | DELETE .../issues/:issueIdOrKey/sharedFiles/:id           | ❌                    |

---

## Wiki

| API                          | Endpoint                                           | Status             |
| ---------------------------- | -------------------------------------------------- | ------------------ |
| Get Wiki Page List           | GET /api/v2/wikis                                  | ✅ `getWikiPages`  |
| Count Wiki Page              | GET /api/v2/wikis/count                            | ✅ `getWikisCount` |
| Get Wiki Page Tag List       | GET /api/v2/wikis/tags                             | ❌                 |
| Add Wiki Page                | POST /api/v2/wikis                                 | ✅ `addWiki`       |
| Get Wiki Page                | GET /api/v2/wikis/:wikiId                          | ✅ `getWiki`       |
| Update Wiki Page             | PATCH /api/v2/wikis/:wikiId                        | ✅ `updateWiki`    |
| Delete Wiki Page             | DELETE /api/v2/wikis/:wikiId                       | ❌                 |
| Get List of Wiki Attachments | GET /api/v2/wikis/:wikiId/attachments              | ❌                 |
| Attach File to Wiki          | POST /api/v2/wikis/:wikiId/attachments             | ❌                 |
| Get Wiki Page Attachment     | GET .../wikis/:wikiId/attachments/:attachmentId    | ❌                 |
| Remove Wiki Attachment       | DELETE .../wikis/:wikiId/attachments/:attachmentId | ❌                 |
| Get Wiki Page History        | GET /api/v2/wikis/:wikiId/history                  | ❌                 |
| Get Wiki Page Star           | GET /api/v2/wikis/:wikiId/stars                    | ❌                 |
| Add Star                     | POST /api/v2/stars                                 | ❌                 |

---

## Notifications

| API                             | Endpoint                                  | Status                            |
| ------------------------------- | ----------------------------------------- | --------------------------------- |
| Get Notification                | GET /api/v2/notifications                 | ✅ `getNotifications`             |
| Count Notification              | GET /api/v2/notifications/count           | ✅ `getNotificationsCount`        |
| Reset Unread Notification Count | POST /api/v2/notifications/markAsRead     | ✅ `resetUnreadNotificationCount` |
| Read Notification               | POST /api/v2/notifications/:id/markAsRead | ✅ `markNotificationAsRead`       |

---

## Git

| API                          | Endpoint                                              | Status                  |
| ---------------------------- | ----------------------------------------------------- | ----------------------- |
| Get List of Git Repositories | GET /api/v2/projects/:projectIdOrKey/git/repositories | ✅ `getGitRepositories` |
| Get Git Repository           | GET .../git/repositories/:repoIdOrName                | ✅ `getGitRepository`   |

---

## Pull Requests

| API                                 | Endpoint                                                  | Status                        |
| ----------------------------------- | --------------------------------------------------------- | ----------------------------- |
| Get Pull Request List               | GET .../git/repositories/:repoIdOrName/pullRequests       | ✅ `getPullRequests`          |
| Get Number of Pull Requests         | GET .../pullRequests/count                                | ✅ `getPullRequestsCount`     |
| Add Pull Request                    | POST .../pullRequests                                     | ✅ `addPullRequest`           |
| Get Pull Request                    | GET .../pullRequests/:number                              | ✅ `getPullRequest`           |
| Update Pull Request                 | PATCH .../pullRequests/:number                            | ✅ `updatePullRequest`        |
| Get Pull Request Comment            | GET .../pullRequests/:number/comments                     | ✅ `getPullRequestComments`   |
| Add Pull Request Comment            | POST .../pullRequests/:number/comments                    | ✅ `addPullRequestComment`    |
| Get Number of Pull Request Comments | GET .../pullRequests/:number/comments/count               | ❌                            |
| Update Pull Request Comment         | PATCH .../pullRequests/:number/comments/:commentId        | ✅ `updatePullRequestComment` |
| Get List of Pull Request Attachment | GET .../pullRequests/:number/attachments                  | ❌                            |
| Download Pull Request Attachment    | GET .../pullRequests/:number/attachments/:attachmentId    | ❌                            |
| Delete Pull Request Attachments     | DELETE .../pullRequests/:number/attachments/:attachmentId | ❌                            |

---

## Watching

| API                   | Endpoint                                      | Status                    |
| --------------------- | --------------------------------------------- | ------------------------- |
| Get Watching List     | GET /api/v2/users/:userId/watchings           | ✅ `getWatchingListItems` |
| Count Watching        | GET /api/v2/users/:userId/watchings/count     | ✅ `getWatchingListCount` |
| Get Watching          | GET /api/v2/watchings/:watchingId             | ❌                        |
| Add Watching          | POST /api/v2/watchings                        | ✅ `addWatching`          |
| Update Watching       | PATCH /api/v2/watchings/:watchingId           | ✅ `updateWatching`       |
| Delete Watching       | DELETE /api/v2/watchings/:watchingId          | ✅ `deleteWatching`       |
| Mark Watching as Read | POST /api/v2/watchings/:watchingId/markAsRead | ✅ `markWatchingAsRead`   |

---

## Teams / Other

| API                   | Endpoint                                      | Status |
| --------------------- | --------------------------------------------- | ---- |
| Get Licence           | GET /api/v2/space/licence                     | ❌   |
| Get List of Teams     | GET /api/v2/teams                             | ❌   |
| Add Team              | POST /api/v2/teams                            | ❌   |
| Get Team              | GET /api/v2/teams/:teamId                     | ❌   |
| Update Team           | PATCH /api/v2/teams/:teamId                   | ❌   |
| Delete Team           | DELETE /api/v2/teams/:teamId                  | ❌   |
| Get Team Icon         | GET /api/v2/teams/:teamId/icon                | ❌   |
| Get Project Team List | GET /api/v2/projects/:projectIdOrKey/teams    | ❌   |
| Add Project Team      | POST /api/v2/projects/:projectIdOrKey/teams   | ❌   |
| Delete Project Team   | DELETE /api/v2/projects/:projectIdOrKey/teams | ❌   |
| Get Rate Limit        | GET /api/v2/rateLimit                         | ❌   |

---

## Summary

| Category                        | Implemented | Total   |
| ------------------------------- | -------- | ------- |
| Space                           | 2        | 7       |
| Users                           | 2        | 13      |
| Statuses/Resolutions/Priorities | 2        | 2       |
| Projects                        | 12       | 34      |
| Issues                          | 8        | 21      |
| Wiki                            | 6        | 14      |
| Notifications                   | 4        | 4       |
| Git                             | 2        | 2       |
| Pull Requests                   | 8        | 12      |
| Watching                        | 6        | 7       |
| Teams/Other                     | 0        | 11      |
| **Total**                       | **52**   | **127** |
