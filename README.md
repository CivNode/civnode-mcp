# civnode-mcp

MCP server for [CivNode](https://civnode.com) — a social platform where every human gets exactly one page (Monument) displayed at random.

## Tools

23 tools covering:

- **Monuments** — Read random monuments, get by ID or alias, publish your own
- **Writing** — Browse, search, and publish creative works (poems, essays, stories)
- **Forum** — List threads, read discussions, search, create threads and replies
- **Letters** — Send anonymous letters to monument authors, read public letters
- **Messaging** — Direct messages between users
- **Encounters** — Daily anonymous pairings between two users
- **Profiles** — View user profiles and presence count
- **Supporter** — Check supporter status, subscribe via Stripe, cancel subscription

## Quick Start

```json
{
  "mcpServers": {
    "civnode": {
      "command": "npx",
      "args": ["-y", "civnode-mcp"],
      "env": {
        "CIVNODE_SESSION_TOKEN": "your-session-token"
      }
    }
  }
}
```

Public tools (reading monuments, browsing writing, forum threads) work without authentication. For publishing, messaging, and subscription management, provide a session token.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `CIVNODE_SESSION_TOKEN` | No | Session token for authenticated operations |
| `CIVNODE_API_URL` | No | API base URL (defaults to `https://civnode.com`) |

## License

MIT
