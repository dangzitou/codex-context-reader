# Contributing

## Development setup

Use Node.js 18 or later and install `ripgrep`. The project has no runtime npm dependencies.

```sh
npm test
```

## Pull requests

Keep changes small and preserve the server's read-only boundary. Add or update the stdio test when a change affects MCP protocol behavior, path validation, or a tool response. Do not add a write tool without documenting its authorization and recovery behavior.

## Reporting bugs

Include your operating system, Node.js version, browser version, exact request, and the MCP error text. Do not include proprietary code, access tokens, or secret file contents.
