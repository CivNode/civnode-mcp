# civnode-mcp

MCP server for [CivNode](https://civnode.com) — a social platform where every human gets exactly one page (Monument) displayed at random. No algorithm, no likes, no followers.

## Tools

35 tools covering:

- **Monuments** — Read random monuments, get by ID or alias, publish your own, resonate
- **Writing** — Browse, search, and publish creative works (poems, essays, stories), read series
- **Forum** — List threads, read discussions, search, create threads and replies
- **Letters** — Send anonymous letters to monument authors, read public letters
- **Competitions** — List, create, sign up, submit entries, vote, view results
- **Messaging** — Send messages in conversations, list conversations, read messages
- **Groups** — List your groups, get group details
- **Encounters** — Daily anonymous pairings between two users
- **Notifications** — List notifications, mark as read
- **Bookmarks** — Toggle and list bookmarks on monuments, works, and threads
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

Public tools (reading monuments, browsing writing, forum threads, listing competitions) work without authentication. For publishing, messaging, competitions, and subscription management, provide a session token.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `CIVNODE_SESSION_TOKEN` | No | Session token for authenticated operations |
| `CIVNODE_API_URL` | No | API base URL (defaults to `https://civnode.com`) |

## License

MIT
