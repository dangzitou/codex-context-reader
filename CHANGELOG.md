# Changelog

## Unreleased

- Project selection now expires after 30 minutes without reads instead of 30 minutes after selection: every successful read renews the window, so active sessions are not interrupted mid-conversation. Idle selections still expire, and the server still clears everything on stop.
- `project_overview` accepts an optional project-relative `path` to list any directory in the project.
- `read_file` accepts 1-8 `paths` in a single call with a shared output budget, and reports each file's total line count with a continuation hint when the range ends mid-file.
- `search_code` accepts an optional `glob` filter and falls back to a bounded built-in search when ripgrep is missing; ripgrep is now optional.

## 0.1.0

- Initial public release.
- Session-only project selection for ChatGPT Chat.
- Read-only project overview, code search, file excerpts, and Git context.
