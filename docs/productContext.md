# Product Context

## Project Purpose

The Backlog MCP Server is a server that integrates Backlog's API with the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/), allowing MCP clients such as Claude to directly access Backlog's project management features.

## Problems Solved

1. **AI and Backlog Integration**
   - Provides a means for large language models (LLMs) to access and manipulate Backlog data
   - Allows users to operate Backlog through AI assistants

2. **Project Management Efficiency**
   - Enables Backlog operations through natural language, reducing UI operations
   - Allows complex queries and batch operations to be delegated to AI

3. **Simplified Information Access**
   - Provides a unified access method to project, issue, Wiki, Document, and Git information
   - Makes it easier to retrieve information across multiple Backlog features

## Key Use Cases

1. **Project Management**
   - Creating, updating, and deleting projects
   - Retrieving project information, project members, categories, custom fields, and issue types

2. **Issue Management**
   - Creating, updating, and deleting issues
   - Searching, listing, and counting issues
   - Adding and updating issue comments
   - Managing version/milestones and watches

3. **Wiki Management**
   - Retrieving and searching Wiki pages
   - Creating and updating Wiki pages

4. **Document Management**
   - Retrieving documents and document trees
   - Adding documents

5. **Git/Pull Request Management**
   - Retrieving repository information
   - Creating, updating, and commenting on pull requests
   - Retrieving and analyzing pull request lists

6. **Notification Management**
   - Retrieving and marking notifications as read
   - Counting and resetting notification counts

## User Experience Goals

1. **Seamless Integration**
   - Natural operation of Backlog from within MCP clients
   - Operation without being conscious of complex API details

2. **Multi-language Support**
   - Support for tool descriptions in multiple languages including Japanese and English
   - Providing a user experience tailored to the user's language environment

3. **Flexible Deployment**
   - Easy deployment via Docker, npx, or a local Node.js build
   - stdio for local clients, Streamable HTTP (optionally with OAuth) for remote clients
   - Customization of settings through environment variables and CLI flags

4. **Controllable Tool Surface**
   - Toolsets can be enabled selectively (`--enable-toolsets`) to keep the tool list small
   - Dynamic toolsets (`--dynamic-toolsets`) let the client enable toolsets at runtime

5. **Extensibility**
   - Easy adaptation to new Backlog API endpoints
   - Customization of functionality through custom descriptions
