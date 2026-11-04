# backlog-mcp-server

## Comments

Keep comments to a minimum. Let names and structure carry the intent, and use a comment only for a "why" that the code cannot show.

Write:

- Security reasons (token leaks, open redirects, SSRF, CSRF, …)
- Behaviour that follows a spec. Cite the RFC or MCP spec section (e.g. `// RFC 9207 — every authorization response carries iss`)
- Code that is counter-intuitive or breaks if removed
- Workarounds for quirks of external systems (Backlog API, MCP clients, runtimes)

Don't write:

- A restatement of the code, or JSDoc that only repeats the name and types
- History, past implementations or change logs (put them in the commit message and PR)
- Alternatives considered or long reasons for not choosing them (put them in the PR or `docs/`)
- Narration of what a test does. Say it in the test name

Aim for 1–3 lines. If it turns into a paragraph, it belongs in the PR description or `docs/`.

When touching existing code, it is fine to remove nearby comments that do not meet this standard.
