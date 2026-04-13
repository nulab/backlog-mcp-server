# Changelog

## [0.10.0](https://github.com/nulab/backlog-mcp-server/compare/v0.9.1...v0.10.0) (2026-04-13)

### Features

* add multi-organization support ([7f2d60a](https://github.com/nulab/backlog-mcp-server/commit/7f2d60a1ec0e47902231830257e58f1e98e761e6))
* add test for rejecting unknown organizations in single-org mode ([ed81fac](https://github.com/nulab/backlog-mcp-server/commit/ed81facaee38228c21bf12c295779271139eef2b))
* enhance composeToolHandler with type safety and clean up imports in tests ([b7f50cd](https://github.com/nulab/backlog-mcp-server/commit/b7f50cda124baa42942c68c3b7aabed9ebaee7a2))
* support env-based multi-org backlog config ([63eb78e](https://github.com/nulab/backlog-mcp-server/commit/63eb78e25e037c0c3f9f0241f8704bc072d52207))

### Bug Fixes

* avoid NodeJS namespace in env typing ([bd0effb](https://github.com/nulab/backlog-mcp-server/commit/bd0effb0cb5bcedb3672bad48448e57405ac7df5))
* **ci:** pin npm to 11.5.1 in release workflow ([54aece7](https://github.com/nulab/backlog-mcp-server/commit/54aece7883376cf31a73ccfaf3b778ef1de3e471))

## [0.9.1](https://github.com/nulab/backlog-mcp-server/compare/v0.9.0...v0.9.1) (2026-03-27)

### Bug Fixes

* move env variable initialization after yargs parsing ([8c1dc11](https://github.com/nulab/backlog-mcp-server/commit/8c1dc11672038364b219ecdda6901a44906d0bdb))

## [0.9.0](https://github.com/nulab/backlog-mcp-server/compare/v0.8.1...v0.9.0) (2026-03-25)

### Features

* add delete_document tool ([0b6fdc0](https://github.com/nulab/backlog-mcp-server/commit/0b6fdc0cc215157e60e7bdf6ff5afecb7c7f9d9b)), closes [#64](https://github.com/nulab/backlog-mcp-server/issues/64)
* add get_user_recent_updates tool ([1c68e14](https://github.com/nulab/backlog-mcp-server/commit/1c68e146893142db373145facdde9ee43e46d011))
* set default values for user recent updates schema ([6f611b0](https://github.com/nulab/backlog-mcp-server/commit/6f611b00a11370f04011bd878ac7bde1b603ba9e))

### Reverts

* reset version to 0.8.1 for proper release-it workflow ([793d142](https://github.com/nulab/backlog-mcp-server/commit/793d142305f117c7bbeb7d0f9e7d1591b1c42bd3))

## [0.8.1](https://github.com/nulab/backlog-mcp-server/compare/v0.8.0...v0.8.1) (2026-03-24)

### Bug Fixes

* add build step before npm publish in release workflow ([#73](https://github.com/nulab/backlog-mcp-server/issues/73)) ([2a66956](https://github.com/nulab/backlog-mcp-server/commit/2a669562a7b0d7009b90817fd5ee4f36f92e99bc))

## [0.8.0](https://github.com/nulab/backlog-mcp-server/compare/v0.7.0...v0.8.0) (2026-03-24)

### Features

* add implement-backlog-api-tool skill for MCP server ([3714461](https://github.com/nulab/backlog-mcp-server/commit/37144614384ef57ba70d43a169e974fd3416b683))
* enable npm trusted publishing via GitHub Actions OIDC ([#70](https://github.com/nulab/backlog-mcp-server/issues/70)) ([bd452c9](https://github.com/nulab/backlog-mcp-server/commit/bd452c9dbb6735d279771af65f604cff1057282a))

### Bug Fixes

* correct type annotation in eslint configuration ([5bef60a](https://github.com/nulab/backlog-mcp-server/commit/5bef60a98f03f05992f97113e0fe308ee0f6d4dc))
* correct typo in function name from registerDyamicTools to registerDynamicTools ([7a25d25](https://github.com/nulab/backlog-mcp-server/commit/7a25d25a130ddab1c9114412ef29d8229e61be50))
* improve clarity in SKILL.md by updating API spec fetching instructions ([a02559b](https://github.com/nulab/backlog-mcp-server/commit/a02559b9635171c00b0cbb69d3e70aa00ae4fe5b))
* improve formatting and clarity in README files ([41407cc](https://github.com/nulab/backlog-mcp-server/commit/41407cc77d9733bfc10d9d2ef61e9cc2c2dcd510))
* **test:** resolve TypeScript type errors in composeToolHandler test ([275570b](https://github.com/nulab/backlog-mcp-server/commit/275570b6c260239a1e9e571670541b4e5040ed27))
* update example values in .env.example for clarity ([2ff9421](https://github.com/nulab/backlog-mcp-server/commit/2ff942166d2d18f942623c9d31bced10352617bc))
* update overview and input sections in SKILL.md for clarity ([c719496](https://github.com/nulab/backlog-mcp-server/commit/c719496faae281e11093e9273e6a6eb61daf9bae))
* update references in SKILL.md for implementing backlog API tool ([a564977](https://github.com/nulab/backlog-mcp-server/commit/a564977da8146887a0c75f1648b4909138482b84))

## [0.7.0](https://github.com/nulab/backlog-mcp-server/compare/v0.6.0...v0.7.0) (2026-02-13)

## Features

### Document Management (#42)
* **Implement addDocument tool**: Added a new tool to facilitate document creation with full integration and comprehensive test coverage.

## [0.6.0](https://github.com/nulab/backlog-mcp-server/compare/v0.5.0...v0.6.0) (2025-12-22)

### Features

* Add watch management tools (#25) ([f94291c](https://github.com/nulab/backlog-mcp-server/commit/f94291c46c3f430abde5ac8d2eb4581b36e24d91))
* add update_wiki tool for wiki page updates (#28) ([c34d9fc](https://github.com/nulab/backlog-mcp-server/commit/c34d9fc01e4998318d660c4535a5887a30edcbfc))

### Chores

* upgrade actions/checkout to v5 in CI and release workflows (#27) ([cf020a8](https://github.com/nulab/backlog-mcp-server/commit/cf020a8b118d4c8311d7787976a90c4cf548fd42))
* **deps:** remove node-fetch (#26) ([82c54cc](https://github.com/nulab/backlog-mcp-server/commit/82c54cc8112837a7278fd8e0002d65eb75ad9a68))
* **deps:** bump @conventional-changelog/git-client and @release-it/conventional-changelog ([c51fdbb](https://github.com/nulab/backlog-mcp-server/commit/c51fdbb171ad48fa99e86100ac6e1d4b59eb0aae))
* **deps:** bump js-yaml (#30) ([f312181](https://github.com/nulab/backlog-mcp-server/commit/f312181e1a1850c563d3e5062296c1991f0fc254))
* **deps:** bump body-parser from 2.2.0 to 2.2.1 (#31) ([1684d94](https://github.com/nulab/backlog-mcp-server/commit/1684d94bd8a861506b94ee57db0f2ba802de7cb4))
* **deps:** bump @modelcontextprotocol/sdk from 1.9.0 to 1.24.0 (#33) ([0fa4c51](https://github.com/nulab/backlog-mcp-server/commit/0fa4c5173cad135bf63b18f73c9884bdb3ffc168))

## [0.5.0](https://github.com/nulab/backlog-mcp-server/compare/v0.4.0...v0.5.0) (2025-10-30)

### Features

* **logger:** add pino logger for improved logging and error handling ([dc7c0f8](https://github.com/nulab/backlog-mcp-server/commit/dc7c0f876f1670bea2bd04b4a0cf6d5a3b5d2665))
* update custom fields handling to support numeric arrays and filters ([26c4a50](https://github.com/nulab/backlog-mcp-server/commit/26c4a5089eb55ae21fcc8d33b1bcd3d1031142ba))

## 0.4.0 (2025-07-23)

## [0.3.1](https://github.com/trknhr/backlog-mcp-server/compare/v0.3.0...v0.3.1)

### Features

* Add custom fields support for getIssues and countIssues tools ([#9](https://github.com/trknhr/backlog-mcp-server/issues/9)) ([e6e42f4](https://github.com/trknhr/backlog-mcp-server/commit/e6e42f4b13116bbb12e1a333df616767a3c5b96e))
## [0.3.0](https://github.com/trknhr/backlog-mcp-server/compare/v0.2.0...v0.3.0) (2025-05-30)

### Features

* add dynamic toolset support and modular registration system ([6bc72e2](https://github.com/trknhr/backlog-mcp-server/commit/6bc72e2624ba6ecbb0e2f192c3792e17867969dd))
* **cli:** add `--prefix` option to prepend string to tool names ([a37c6b1](https://github.com/trknhr/backlog-mcp-server/commit/a37c6b1ef5f8324df2cec8d9c4e3f6bef4d9cc50))
## [0.2.0](https://github.com/trknhr/backlog-mcp-server/compare/v0.1.1...v0.2.0) (2025-05-14)

### Features

* **issue:** support structured custom field input via `customFields` ([12ab057](https://github.com/trknhr/backlog-mcp-server/commit/12ab057efcdced87408f3f09dba0f8a02e060c5a)), closes [#3](https://github.com/trknhr/backlog-mcp-server/issues/3)
* **tools:** split project identifier into separate fields for ID and key across all tools ([8bbb772](https://github.com/trknhr/backlog-mcp-server/commit/8bbb772bce822d16a7315fc4508c3ea66d439402))
* **tools:** support explicit issueId/issueKey instead of issueIdOrKey ([858b301](https://github.com/trknhr/backlog-mcp-server/commit/858b30131ff1f70e3dccade875b0e1037867e079)), closes [#2](https://github.com/trknhr/backlog-mcp-server/issues/2) [#4](https://github.com/trknhr/backlog-mcp-server/issues/4)
* **tools:** unify ID resolution for repositories using resolveIdOrName ([d228c2a](https://github.com/trknhr/backlog-mcp-server/commit/d228c2a594c7f703c1b843753b6f32a97078dba6))

### Bug Fixes

* **lint:** suppress no-undef error in JS files and remove `any` from customFields payload ([f9fd4ce](https://github.com/trknhr/backlog-mcp-server/commit/f9fd4ce56fc48d7bb89c31d16aef633ced92dfd1))
## [0.1.1](https://github.com/trknhr/backlog-mcp-server/compare/v0.1.0...v0.1.1) (2025-05-08)

### Bug Fixes

* **get_issue:** require issueIdOrKey as string to prevent invalid LLM input ([ea2a54f](https://github.com/trknhr/backlog-mcp-server/commit/ea2a54f0ec3a698a29ead2ff8f4469658bc0e5c6))
## [0.1.0](https://github.com/trknhr/backlog-mcp-server/compare/v0.0.2...v0.1.0) (2025-05-01)

### Features

* Add slim version with --optimize-response and refactor tools ([9345c72](https://github.com/trknhr/backlog-mcp-server/commit/9345c72e137eb57b2c4cea52468fefebae0ed453))
* **config:** add CLI and env-based resolvers for maxTokens and optimize-response ([c7c8e4b](https://github.com/trknhr/backlog-mcp-server/commit/c7c8e4b88647f74f28d60c3a16f45eb362f25be1))
* **handler:** add max token limit and refactor handler composition ([21d2279](https://github.com/trknhr/backlog-mcp-server/commit/21d22798599576dad230f76b75409cbfb7b71bae))
## [0.0.2](https://github.com/trknhr/backlog-mcp-server/compare/v0.0.1...v0.0.2) (2025-04-24)

### Features

* add error handling for all tools ([c4a0357](https://github.com/trknhr/backlog-mcp-server/commit/c4a03573f7d5aaa298590dcd23f5a948e76d29e5))
* **wiki:** add wiki creation tool ([9c0240c](https://github.com/trknhr/backlog-mcp-server/commit/9c0240cfdb2f288a9cabaa50d406459711f6c1df))

### Bug Fixes

* revise lint error ([2297494](https://github.com/trknhr/backlog-mcp-server/commit/229749450f08db180cf60885dba01ed010857d02))
## [0.0.1](https://github.com/trknhr/backlog-mcp-server/compare/e64fc4a2acb0f5f18e885932df643430b9c163d4...v0.0.1) (2025-04-21)

### Features

* Japanese labels for all endpoints and variables ([0b8a47c](https://github.com/trknhr/backlog-mcp-server/commit/0b8a47cae4eafb9c0b7e7137149d19472426950e))

### Bug Fixes

* add shebang to `index.ts` ([e64fc4a](https://github.com/trknhr/backlog-mcp-server/commit/e64fc4a2acb0f5f18e885932df643430b9c163d4))
