# CivNode MCP Server

MCP server for [CivNode](https://civnode.com) — the AI-powered creative writing platform where every human gets exactly one page (a Monument) displayed at random. No algorithm, no likes, no followers.

**189 tools** for writing, world-building (characters, locations, creatures, plots, family trees), books, research, marketplace, forums, competitions, collaboration, and platform administration.

## Quick Start

```bash
npx civnode-mcp
```

No installation required. The server runs via `npx` and communicates over stdio using the [Model Context Protocol](https://modelcontextprotocol.io/).

## Configuration

### Claude Desktop

Add to `~/.config/claude/claude_desktop_config.json`:

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

### Claude Code

Add to `.claude/settings.json` or `~/.claude/settings.json`:

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

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CIVNODE_SESSION_TOKEN` | For authenticated tools | Your CivNode session token |
| `CIVNODE_API_URL` | No | API base URL (default: `https://civnode.com`) |

## Authentication

Tools fall into three categories:

- **Public** — No token needed. Browse monuments, read works, search users.
- **Authenticated** — Requires `CIVNODE_SESSION_TOKEN`. Publishing, messaging, managing your compendium.
- **Admin** — Requires a token with admin role. System management, moderation, bot simulation. These tools only appear when a token is configured.

To get a session token, log in to CivNode and go to Settings → API Token.

---

## Tool Reference

### Monuments

Every user has exactly one Monument — their single page on the platform, displayed at random to visitors.

| Tool | Auth | Description |
|------|------|-------------|
| `get_random_monument` | No | Get a random Monument. Optionally filter by mood tags. |
| `get_monument` | No | Read a specific Monument by UUID. |
| `get_monument_by_alias` | No | Read a user's Monument by their alias. |
| `publish_monument` | Yes | Publish or update your Monument. Accepts title, body (Markdown), sources, identity mode. |
| `resonate` | Yes | Leave quiet appreciation on a Monument or work (CivNode's alternative to likes). |

### Letters

Anonymous letters sent to Monument authors, plus direct personal letters between users.

| Tool | Auth | Description |
|------|------|-------------|
| `send_letter` | Yes | Send an anonymous letter to a Monument author (max 500 words). |
| `get_public_letters` | No | Get publicly displayed letters on a user's Monument. |
| `personal_letter_inbox` | Yes | Get your personal letter inbox. |
| `personal_letter_sent` | Yes | Get your sent personal letters. |
| `send_personal_letter` | Yes | Send a direct, non-anonymous letter to another user. |
| `read_personal_letter` | Yes | Read a specific personal letter (marks as read). |

### Writing

Create, publish, and manage creative writing — poems, short stories, essays, novellas, and more.

| Tool | Auth | Description |
|------|------|-------------|
| `browse_writing` | No | Browse published works. Filter by literary form or mood. |
| `get_work` | No | Read a specific work by UUID. |
| `search_writing` | No | Full-text search across published works. |
| `publish_work` | Yes | Publish a new work with title, content (Markdown), form, mood tags, and visibility. |
| `list_my_works` | Yes | List your own works (drafts and published). |
| `update_work` | Yes | Update a work's content, title, mood tags, or visibility. |
| `delete_work` | Yes | Delete a work permanently. |
| `export_work` | Yes | Export a work's content. |
| `get_series` | No | Get a writing series with all its works in reading order. |
| `create_series` | Yes | Create a new writing series. |
| `list_my_series` | Yes | List your writing series. |
| `add_work_to_series` | Yes | Add a work to a series. |
| `ai_writing_feedback` | Yes | Get AI feedback on clarity, pacing, voice, and engagement. |
| `ai_title_summary_suggest` | Yes | Get AI-suggested titles and summaries. |

### Characters

Full character management with AI generation, portraits, and marketplace publishing.

| Tool | Auth | Description |
|------|------|-------------|
| `list_characters` | Yes | List your characters. |
| `get_character` | Yes | Get a character's full profile. |
| `create_character` | Yes | Create a character (only name required, fill rest later or use AI). |
| `update_character` | Yes | Update character fields (pass only fields to change). |
| `delete_character` | Yes | Delete a character permanently. |
| `ai_generate_character` | Yes | Generate a complete character using AI. Accepts role, genre, setting hints. |
| `character_portrait_generate` | Yes | Generate an AI portrait. Requires an image provider. |
| `character_suggestions` | Yes | Get AI suggestions for a specific field (appearance, personality, backstory, etc.). |
| `character_publish` | Yes | Publish to the marketplace. |
| `character_unpublish` | Yes | Remove from the marketplace. |
| `character_relationships` | Yes | Get all relationships for a character. |

### Locations

World-building locations with areas, blueprints, and AI-powered generation.

| Tool | Auth | Description |
|------|------|-------------|
| `list_locations` | Yes | List your locations. |
| `get_location` | Yes | Get full location details. |
| `create_location` | Yes | Create a location (name required). Fields: description, atmosphere, sensory details, inhabitants, secrets, etc. |
| `update_location` | Yes | Update location fields. |
| `delete_location` | Yes | Delete a location permanently. |
| `location_ai_fill` | Yes | AI fills in missing details based on name and existing fields. |
| `location_ai_image` | Yes | Generate an AI image. Requires an image provider. |
| `location_publish` | Yes | Publish to the marketplace. |
| `location_unpublish` | Yes | Remove from the marketplace. |
| `get_location_blueprint` | Yes | Get the visual blueprint/map. |

### Creatures

Creatures and fantastical beings with full AI support.

| Tool | Auth | Description |
|------|------|-------------|
| `list_creatures` | Yes | List your creatures. |
| `get_creature` | Yes | Get full creature profile. |
| `create_creature` | Yes | Create a creature (name and species_type required). |
| `update_creature` | Yes | Update creature fields. |
| `delete_creature` | Yes | Delete a creature permanently. |
| `ai_generate_creature` | Yes | Generate a creature using AI. Accepts species_type, habitat_type, era. |
| `creature_ai_image` | Yes | Generate an AI image. |
| `creature_portrait_generate` | Yes | Generate an AI portrait. |
| `creature_publish` | Yes | Publish to the marketplace. |
| `creature_unpublish` | Yes | Remove from the marketplace. |
| `creature_suggestions` | Yes | Get AI suggestions for a field. |

### Plots

Structured plot outlines with acts, scenes, beats, and AI generation.

| Tool | Auth | Description |
|------|------|-------------|
| `list_plots` | Yes | List your plots. |
| `get_plot` | Yes | Get full plot with acts, scenes, and beats. |
| `create_plot` | Yes | Create a plot (title required). Fields: genre, tone, central_conflict, etc. |
| `update_plot` | Yes | Update plot fields. |
| `delete_plot` | Yes | Delete a plot permanently. |
| `plot_add_act` | Yes | Add an act (title, summary, purpose, notes). |
| `plot_ai_acts` | Yes | Generate acts using AI. |
| `plot_add_scene` | Yes | Add a scene to an act. |
| `plot_ai_scenes` | Yes | Generate scenes for an act using AI. |
| `plot_ai_image` | Yes | Generate an AI image for the plot. |
| `plot_publish` | Yes | Publish to the marketplace. |
| `plot_unpublish` | Yes | Remove from the marketplace. |

### Family Trees

Visual family trees linking characters and creatures with relationship tracking.

| Tool | Auth | Description |
|------|------|-------------|
| `list_trees` | Yes | List your family trees. |
| `get_tree_members` | Yes | Get all members in a tree. |
| `create_tree` | Yes | Create a family tree (name required). |
| `update_tree` | Yes | Update tree name or description. |
| `delete_tree` | Yes | Delete a tree permanently. |
| `tree_add_member` | Yes | Add a character or creature to a tree. |
| `tree_generate` | Yes | Generate family members using AI. |
| `tree_publish` | Yes | Publish to the marketplace. |
| `tree_unpublish` | Yes | Remove from the marketplace. |

### Books

Full book management — create books with chapters, link compendium entities, export.

| Tool | Auth | Description |
|------|------|-------------|
| `list_books` | Yes | List your books. |
| `get_book` | Yes | Get book details and linked entities. |
| `create_book` | Yes | Create a book (title and book_type required). Types: novel, novella, short_story_collection, poetry_collection, anthology, other. |
| `update_book` | Yes | Update book metadata (title, subtitle, blurb, genre, etc.). |
| `delete_book` | Yes | Delete a book and all chapters. |
| `list_chapters` | Yes | List chapters in a book. |
| `get_chapter` | Yes | Get a chapter's content and metadata. |
| `create_chapter` | Yes | Create a chapter (title and chapter_type required). Types: chapter, prologue, epilogue, interlude, appendix. |
| `update_chapter` | Yes | Update chapter content or metadata. |
| `delete_chapter` | Yes | Delete a chapter. |
| `reorder_chapters` | Yes | Reorder chapters (pass chapter IDs in desired order). |
| `book_link_entity` | Yes | Link a compendium entity to a book (characters, creatures, locations, plots, trees). |
| `book_unlink_entity` | Yes | Remove a linked entity from a book. |
| `export_book` | Yes | Export a book's content. |
| `get_public_book` | No | Get a published book's public info. |

### Canvases

Collaborative drawing and brainstorming boards within groups.

| Tool | Auth | Description |
|------|------|-------------|
| `list_canvases` | Yes | List your canvases. |
| `get_canvas` | Yes | Get a canvas with nodes and metadata. |
| `create_canvas` | Yes | Create a canvas in a group. |
| `update_canvas` | Yes | Update canvas name. |
| `delete_canvas` | Yes | Delete a canvas permanently. |

### Research & Observatory

Semantic search, chapter analysis, writing insights, and AI-powered questions about your work.

| Tool | Auth | Description |
|------|------|-------------|
| `research_search` | Yes | Semantic search across research notes and analyzed content. |
| `research_analyze_chapter` | Yes | Analyze a chapter for characters, themes, plot points. Requires AI provider. |
| `research_intelligence` | Yes | Get aggregated intelligence: character appearances, themes, timeline. |
| `research_character_graph` | Yes | Get a character's relationship graph and arc. |
| `observatory_insights` | Yes | Get writing insights and patterns. |
| `observatory_stats` | Yes | Get writing statistics: word counts, streaks, productivity. |
| `observatory_moments` | Yes | Get notable moments: breakthroughs, milestones, patterns. |
| `observatory_ask` | Yes | Ask AI about your writing patterns and story structure. |
| `observatory_summary` | Yes | Get an AI summary of your writing journey. |

### Marketplace

Browse and fork community-published characters, creatures, locations, plots, families, and books.

| Tool | Auth | Description |
|------|------|-------------|
| `marketplace_browse` | No | Browse marketplace by entity type (characters, creatures, locations, plots, families, books). |
| `marketplace_get` | No | Get detailed view of a marketplace item. |
| `marketplace_fork` | Yes | Fork (copy) a marketplace item into your compendium. |

### Forum

Every user on CivNode has their own forum.

| Tool | Auth | Description |
|------|------|-------------|
| `forum_list_threads` | No | List threads in a user's forum. |
| `forum_read_thread` | No | Read a thread with all posts. |
| `forum_search` | No | Search threads by keyword. |
| `forum_post` | Yes | Create a new thread or reply. Provide thread_id for replies, or forum_alias + title for new threads. |

### Competitions

Community writing competitions with signup, submission, and voting phases.

| Tool | Auth | Description |
|------|------|-------------|
| `list_competitions` | No | List competitions. Filter by phase: signup, writing, voting, completed. |
| `get_competition` | Yes | Get competition details. |
| `create_competition` | Yes | Create a competition (requires supporter status). |
| `competition_signup` | Yes | Sign up for a competition. |
| `competition_submit_entry` | Yes | Submit your entry (writing phase only). |
| `competition_vote` | Yes | Vote for top 3 entries (voting phase only). |
| `competition_entries` | No | Get blind entries (voting/completed phase). |
| `competition_results` | No | Get ranked results (completed phase). |

### Collaboration

Real-time co-writing, draft sharing, and writing workshops.

| Tool | Auth | Description |
|------|------|-------------|
| `create_share_link` | Yes | Generate a shareable link for a work. |
| `list_share_links` | Yes | List share links for a work. |
| `get_shared_work` | No | Read a shared work by its token. |
| `delete_share_link` | Yes | Delete a share link. |
| `list_collaborators` | Yes | List collaborators on a work. |
| `invite_collaborator` | Yes | Invite a user as coauthor or editor. |
| `accept_collaboration` | Yes | Accept a collaboration invitation. |
| `remove_collaborator` | Yes | Remove a collaborator. |
| `list_workshops` | Yes | List writing workshops in a group. |
| `create_workshop` | Yes | Submit a work for group critique. |
| `get_workshop` | Yes | Get workshop details and reviews. |
| `submit_workshop_review` | Yes | Submit a review with optional ratings (clarity, pacing, voice, engagement). |

### Groups, Topics & Community

| Tool | Auth | Description |
|------|------|-------------|
| `list_groups` | Yes | List groups you belong to. |
| `get_group` | Yes | Get group details. |
| `list_topics` | No | List topic communities. |
| `join_topic` | Yes | Join a topic. |
| `leave_topic` | Yes | Leave a topic. |
| `get_encounter` | Yes | Get today's encounter (daily anonymous pairing). |
| `get_presence` | No | See how many people are online (ambient count, no identities). |

### Messaging

| Tool | Auth | Description |
|------|------|-------------|
| `send_message` | Yes | Send a message in a conversation. |
| `list_conversations` | Yes | List your conversations. |
| `read_conversation` | Yes | Read messages in a conversation. |

### Platform

| Tool | Auth | Description |
|------|------|-------------|
| `get_profile` | No | Get a user's public profile. |
| `search_users` | No | Search users by alias or name. |
| `search_content` | No | Search across all public content. |
| `list_notifications` | Yes | List your notifications. |
| `mark_notifications_read` | Yes | Mark all notifications as read. |
| `list_bookmarks` | Yes | List your bookmarks. |
| `toggle_bookmark` | Yes | Toggle a bookmark on content. |
| `list_highlights` | Yes | List your text highlights. |
| `create_highlight` | Yes | Highlight text on a monument or work. |
| `delete_highlight` | Yes | Delete a highlight. |
| `get_notepad` | Yes | Get your private notepad. |
| `update_notepad` | Yes | Update your notepad content. |
| `get_supporter_status` | Yes | Check supporter status. |
| `supporter_checkout` | Yes | Start Stripe checkout for supporter ($5/month). |
| `supporter_cancel` | Yes | Cancel supporter subscription. |

---

## Admin Tools

Admin tools require a session token with admin role. They only appear when a token is configured.

| Tool | Description |
|------|-------------|
| `admin_health` | System health: app status, migration version, DB/Redis connectivity. |
| `admin_stats` | System-wide statistics: users, works, monuments, forums, moderation. |
| `admin_users` | List all users with details and status. |
| `admin_user_ban` | Ban a user. |
| `admin_user_unban` | Unban a user. |
| `admin_moderation_queue` | View flagged content awaiting review. |
| `admin_ai_providers` | List configured AI text providers. |
| `admin_ai_provider_keys` | List AI providers with partial API keys visible. |
| `admin_image_providers` | List image generation providers. |
| `admin_embedding_providers` | List embedding providers. |
| `admin_ai_usage` | AI token usage statistics. |
| `admin_test_ai_chat` | Test AI chat pipeline with a prompt. |
| `admin_test_embedding` | Test embedding pipeline. |
| `admin_test_ollama` | Test local Ollama connectivity from the server. |
| `admin_backups` | List database backups. |
| `admin_trigger_backup` | Trigger an immediate backup. |
| `admin_feedback` | List user feedback and bug reports. |
| `admin_site_settings` | View site-wide settings. |
| `admin_update_site_settings` | Update site settings (registration, maintenance mode). |
| `admin_research_stats` | Research system statistics. |
| `admin_botsim_state` | Bot simulation state. |
| `admin_botsim_bots` | List simulated bots. |
| `admin_botsim_tick` | Trigger one simulation tick. |
| `admin_images` | List AI-generated images with moderation status. |
| `admin_block_image` | Block an AI-generated image. |
| `admin_campaigns` | List marketing campaigns. |
| `admin_ornaments` | List monument ornaments. |

---

## Local Development

To run against a local CivNode instance:

```bash
CIVNODE_API_URL=http://localhost:9080 CIVNODE_SESSION_TOKEN=your-token npx civnode-mcp
```

Or in your MCP client config:

```json
{
  "mcpServers": {
    "civnode-local": {
      "command": "npx",
      "args": ["-y", "civnode-mcp"],
      "env": {
        "CIVNODE_API_URL": "http://localhost:9080",
        "CIVNODE_SESSION_TOKEN": "your-local-token"
      }
    }
  }
}
```

## Troubleshooting

**"Authentication required"** — Set the `CIVNODE_SESSION_TOKEN` environment variable. Get a token from Settings → API Token on CivNode.

**"Forbidden"** — Your token doesn't have permission for that action. Admin tools require admin role.

**"Rate limit exceeded"** — Wait a moment and retry. CivNode rate-limits API calls per user.

**"API error: 404"** — The resource doesn't exist or you don't have access. Check the UUID.

**Admin tools not showing** — Admin tools only appear when `CIVNODE_SESSION_TOKEN` is set. They also require server-side admin role.

**Wrong API URL** — By default the server connects to `https://civnode.com`. Set `CIVNODE_API_URL` for local development.

## Contributing

### Adding a New Tool

1. Add a tool object to the `tools` array in `index.js` (or the admin section for admin tools):

```javascript
{
  name: "tool_name",
  description: "What it does. Mention auth requirement.",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "Resource UUID" },
    },
    required: ["id"],
  },
  handler: (args) => fetchAPI(`/api/endpoint/${args.id}`),
},
```

2. Use the existing HTTP helpers: `fetchAPI` (GET), `postAPI` (POST), `putAPI` (PUT), `patchAPI` (PATCH), `deleteAPI` (DELETE).

3. Update the tool count in the header comment and `package.json`.

4. Test locally: `CIVNODE_API_URL=http://localhost:9080 node index.js`

5. Bump version in `package.json` and push to main — CI auto-publishes to npm.

## License

MIT
