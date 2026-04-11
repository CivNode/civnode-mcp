# CivNode MCP Server

MCP server for [CivNode](https://civnode.com) — the AI-powered creative writing platform where every human gets exactly one page (a Monument) displayed at random. No algorithm, no likes, no followers.

**260 tools** for writing, world-building (characters, locations, creatures, plots, family trees), entity exploration, books, collections, showcase, research, marketplace, library, forums, competitions, collaboration, passage comments, civic room, and platform administration.

## Quick Start

```bash
npx @civnode/mcp
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
      "args": ["-y", "@civnode/mcp"],
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
      "args": ["-y", "@civnode/mcp"],
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
| `user_update_working_on` | Yes | Set or clear the "currently working on" status shown on your profile (max 100 chars, optional work link). |

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
| `entity_explorer_chat_character` | Yes | Interview a character via the Entity Explorer. Chat in character, grounded in your story data. Requires BYOK AI provider. |

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
| `entity_explorer_chat_location` | Yes | Explore a location via the Entity Explorer. Analyze ripple effects of changes. Requires BYOK AI provider. |

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
| `entity_explorer_chat_creature` | Yes | Interview a creature via the Entity Explorer. Chat in character, grounded in your story data. Requires BYOK AI provider. |

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
| `update_plot_scene` | Yes | Update a scene's text fields (title, summary, purpose, style_hint, pov_character, notes), location bindings (region_id, area_id, spot_id — pass `null` to clear), or move it between acts in the same plot by passing `act_id` (optionally with `sort_order` to position it in the new act). |
| `plot_ai_scenes` | Yes | Generate scenes for an act using AI. |
| `plot_ai_image` | Yes | Generate an AI image for the plot. |
| `plot_publish` | Yes | Publish to the marketplace. |
| `plot_unpublish` | Yes | Remove from the marketplace. |
| `entity_explorer_chat_plot` | Yes | Explore a plot via the Entity Explorer. Analyze branching possibilities and tension points. Requires BYOK AI provider. |

### Plot Designer (Book-level)

Tools for the dedicated Plot Designer screen at `/books/{bookId}/plot`.

| Tool | Auth | Description |
|------|------|-------------|
| `list_plot_templates` | No | List available plot structure templates (Three-Act, Hero's Journey, etc.). |
| `get_plot_template` | Yes | Get a single plot template with full beat details (acts → beats → name + hint). |
| `get_book_plot` | Yes | Get the plot linked to a book with all acts, scenes, and beats. |
| `create_book_plot_from_template` | Yes | Create a plot from a template and link to a book. |
| `get_plot_synopsis` | Yes | Read the cached AI synopsis for a book's plot. Does not trigger regeneration. Returns `{synopsis, hash, generated_at}` or null fields if none has been generated. |
| `regenerate_plot_synopsis` | Yes | Force regeneration of the AI synopsis. Cache-aware: returns the cached value if the plot content hasn't drifted. Requires BYOK. |
| `delete_book_plot` | Yes | Delete the plot linked to a book. |
| `create_plot_beat` | Yes | Create a beat under a scene. sort_order auto-assigned. |
| `update_plot_beat` | Yes | Update fields on a plot beat. Pass only the fields to change. |
| `delete_plot_beat` | Yes | Delete a plot beat by UUID. |
| `reorder_plot_beats` | Yes | Reorder beats within a scene via {id, sort_order} list. |
| `get_beat_suggestions` | Yes | Get story evidence suggestions for a beat (analysis, text stats, semantic). |
| `auto_map_plot` | Yes | Batch-map story content to all empty beats using analysis + AI. |

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
| `create_book` | Yes | Create a book (title and book_type required). Types: novel, poetry_collection, essay_collection, screenplay. For screenplays, also pass screenplay_format. |
| `update_book` | Yes | Update book metadata (title, subtitle, blurb, genre, etc.). Set `published: true/false` to publish or unpublish a book to the marketplace. Screenplays support screenplay_format, screenplay_font, screenplay_title_page. |
| `delete_book` | Yes | Delete a book and all chapters. |
| `list_chapters` | Yes | List chapters in a book. |
| `get_chapter` | Yes | Get a chapter's content and metadata. |
| `create_chapter` | Yes | Create a chapter (title and chapter_type required). Types: chapter, prologue, epilogue, interlude, appendix. Optional `plot_scene_id` links the new chapter to a plot scene you own (silently skipped if the scene isn't on one of your plots) — powers the Plot Canvas drawer's "Create chapter from this scene" button. |
| `update_chapter` | Yes | Update chapter content or metadata. |
| `delete_chapter` | Yes | Delete a chapter. |
| `reorder_chapters` | Yes | Reorder chapters (pass chapter IDs in desired order). |
| `book_link_entity` | Yes | Link a compendium entity to a book (characters, creatures, locations, plots, trees). |
| `book_unlink_entity` | Yes | Remove a linked entity from a book. |
| `export_book` | Yes | Export a book's content in various formats (json, markdown, html, epub, pdf, fdx, fountain). |
| `import_fountain` | Yes | Import a Fountain screenplay as a new book. |
| `book_entities` | Yes | Get all entity types linked to a book in one call (characters, creatures, locations, plots, trees). |
| `compendium_unassigned` | Yes | Get entities not linked to any book or work. |
| `get_public_book` | No | Get a published book's public info. |

### Collections

Group books and works into ordered collections.

| Tool | Auth | Description |
|------|------|-------------|
| `create_collection` | Yes | Create a new collection (title required, optional description). |
| `list_collections` | Yes | List all your collections. |
| `get_collection` | Yes | Get a collection with its ordered items (books and works). |
| `update_collection` | Yes | Update a collection's title or description. |
| `delete_collection` | Yes | Delete a collection (items are unlinked, not deleted). |
| `collection_add_item` | Yes | Add a book or work to a collection. |
| `collection_remove_item` | Yes | Remove an item from a collection. |
| `collection_reorder` | Yes | Reorder items in a collection by passing ordered item IDs. |

### Showcase

Your showcase is your public gallery — the books, works, and collections you have chosen to share with visitors.

| Tool | Auth | Description |
|------|------|-------------|
| `showcase_list` | No | Get a user's public showcase items. Supports search, type filtering, and pagination. |
| `showcase_count` | No | Get the number of items in a user's showcase. |
| `showcase_add` | Yes | Add a book, work, or collection to your showcase. Provide exactly one ID. |
| `showcase_mine` | Yes | List your own showcase items. |
| `showcase_update_note` | Yes | Update the author note on a showcase item (max 280 chars). |
| `showcase_remove` | Yes | Retract an item from your showcase. It stays in My Writing but becomes private. |
| `showcase_reorder` | Yes | Set display order by providing item IDs in the desired order. |

### Canvases

Collaborative drawing and brainstorming boards within groups.

| Tool | Auth | Description |
|------|------|-------------|
| `list_canvases` | Yes | List your canvases. |
| `get_canvas` | Yes | Get a canvas with nodes and metadata. |
| `create_canvas` | Yes | Create a canvas in a group. |
| `update_canvas` | Yes | Update canvas name. |
| `delete_canvas` | Yes | Delete a canvas permanently. |

### Passage Comments

Contextual feedback anchored to specific text passages in works and monuments.

| Tool | Auth | Description |
|------|------|-------------|
| `passage_comments_inbox` | Yes | Get passage comments others left on your works. |
| `passage_comments_mine` | Yes | Get passage comments you wrote on other works. |
| `passage_comments_create` | Yes | Create a passage comment anchored to a text selection. |
| `passage_comments_list` | Yes | List passage comments for a specific work or monument. |
| `passage_comments_reply` | Yes | Reply to a passage comment. |
| `passage_comments_delete` | Yes | Delete a passage comment. |
| `passage_comments_resonate` | Yes | Leave quiet appreciation on a passage comment. |
| `passage_comments_escalate` | Yes | Escalate a passage comment for moderation review. |
| `passage_comments_mark_read` | Yes | Mark a passage comment as read. |
| `passage_comments_dismiss` | Yes | Dismiss a passage comment from your inbox. |

### Research & Observatory

Semantic search, tiered chapter analysis, writing insights, and AI-powered questions about your work.

| Tool | Auth | Description |
|------|------|-------------|
| `research_search` | Yes | Semantic search across research notes and analyzed content. |
| `research_analyze_chapter` | Yes | Trigger tiered chapter analysis. Core (Tier 1): characters, themes, arcs, interactions. Deep (Tier 2): voice, foreshadowing, craft metrics. Requires AI provider. |
| `research_intelligence` | Yes | Get aggregated intelligence: character appearances, themes, timeline. |
| `research_character_graph` | Yes | Get a character's relationship graph and arc. |
| `observatory_insights` | Yes | Get writing insights and patterns. |
| `observatory_stats` | Yes | Get writing statistics: word counts, streaks, productivity. |
| `observatory_moments` | Yes | Get notable moments: breakthroughs, milestones, patterns. |
| `observatory_ask` | Yes | Ask AI about your writing patterns and story structure. |
| `observatory_summary` | Yes | Get an AI summary of your writing journey. |
| `book_character_evolution` | Yes | Get character evolution data for a book — emotional state, driving forces, chapter timeline, and ghost characters. |

### Marketplace

Browse and fork community-published characters, creatures, locations, plots, families, and books.

| Tool | Auth | Description |
|------|------|-------------|
| `marketplace_browse` | No | Browse marketplace by entity type (characters, creatures, locations, plots, families, books). |
| `marketplace_get` | No | Get detailed view of a marketplace item. |
| `marketplace_fork` | Yes | Fork (copy) a marketplace item into your compendium. |
| `marketplace_book_showcase` | No | Get a published book's full showcase with author info and all entities. |
| `marketplace_fork_book` | Yes | Fork a published marketplace book and all its entities into your collection. |

### Library

Curated showcase books that demonstrate CivNode's world-building capabilities.

| Tool | Auth | Description |
|------|------|-------------|
| `library_books` | No | List the 4 showcase books in the CivNode library. |
| `library_fork_book` | Yes | Fork a library book and all its entities into your collection. |

### Site Forum

The CivNode community forum at `/forum`, open to all users.

| Tool | Auth | Description |
|------|------|-------------|
| `forum_site_categories` | No | List the six categories in the site-wide forum (Announcements, Writing Craft, Writing Groups, Competitions, Feedback & Ideas, Introductions). |
| `forum_site_threads` | No | List threads in the site-wide forum. Accepts optional `category_id` to filter by category and `cursor` for pagination. |
| `forum_site_create_thread` | Yes | Create a new thread in the site-wide forum. Requires `title` and `body_markdown`; optionally provide `category_id`. |

### Personal Forum

Every user on CivNode also has their own personal forum on their profile.

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

Real-time co-writing and draft sharing.

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

### Groups, Topics & Community

| Tool | Auth | Description |
|------|------|-------------|
| `list_groups` | Yes | List groups you belong to. |
| `create_group` | Yes | Create a new writing group. Types: critique, accountability, workshop, co_writing, sprint. Caller becomes owner. |
| `get_group` | Yes | Get group details. |
| `group_update` | Yes | Update a group's name and description (owner/leader only). |
| `delete_group` | Yes | Delete a group permanently (owner only). Removes all cycles, submissions, and rooms. |
| `group_settings_get` | Yes | Get feature settings for a group (caller must be a member). Returns submissions_enabled, reciprocity_mode, cycles_enabled, etc. |
| `group_settings_update` | Yes | Update feature settings for a group (owner/leader only). Pass any subset of: submissions_enabled, reciprocity_mode, silent_period_enabled, cycles_enabled, critique_templates_enabled, goals_enabled, sprints_enabled, challenges_enabled, project_tracking_enabled, directory_listed, member_cap. |
| `group_add_member` | Yes | Add a user to a group by user_id (owner/leader only). |
| `group_remove_member` | Yes | Remove a member from a group. Owner/leaders can remove anyone; members can remove themselves. |
| `group_list_members` | Yes | List all group members with roles (owner, leader, moderator, member). |
| `group_promote_member` | Yes | Promote or demote a member to a new role (leader, moderator, member). Owner can set any role; leaders can promote to moderator only. |
| `group_transfer_ownership` | Yes | Transfer ownership to another member (owner only). Former owner becomes leader. |
| `group_warn_member` | Yes | Issue a warning to a member with a required reason. Returns the warning and strike number. Moderators, leaders, and owner can warn. |
| `group_list_warnings` | Yes | List warnings issued to a specific member. Accessible by moderators, leaders, owner, or the member themselves. |
| `group_ban_member` | Yes | Ban a member from the group (leaders and owner only). Requires a reason. Member is removed immediately. |
| `group_unban_member` | Yes | Remove a ban on a user (owner only). |
| `group_list_bans` | Yes | List all currently banned members (owner and leaders only). |
| `group_report` | Yes | Report a group or specific member for a rules violation. Any group member can report. |
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
| `update_tagline` | Yes | Update your profile tagline (max 200 chars). |
| `get_social_links` | No | Get a user's social links. |
| `update_social_links` | Yes | Update your social links (replaces all). |
| `update_avatar_source` | Yes | Set avatar source (goavatar, gravatar, custom). |
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
| `purchase_checkout` | Yes | Create Stripe checkout to purchase a book or work. |
| `check_purchase` | Yes | Check if current user has purchased a specific item. |
| `list_my_purchases` | Yes | List all purchases by current user. |
| `get_author_balance` | Yes | Get author earnings balance and lifetime totals. |
| `list_author_sales` | Yes | List all sales for current user as author. |
| `ai_usage_log_local` | Yes | Log local AI usage (Ollama, ComfyUI) from the browser. |
| `link_preview` | No | Get a rich preview for an internal CivNode URL. Returns title, author, image, and meta for published content. |

### Speech Writing

Deterministic speech metrics and chapter revision history for writers working
on speeches. Every metric is computed from LanguageTool plus rule-based Go
packages — no LLM calls anywhere in these tools.

| Tool | Auth | Description |
|------|------|-------------|
| `speech_analysis` | Yes | Return speech metrics for a chapter: delivery time, word/syllable/sentence counts, LIX, Flesch-Kincaid, breath-test violations, filler words, passive voice, rhetorical devices, per-sentence timings. Results cached per content hash. |
| `convert_to_speech` | Yes | Flip a book's type to `speech`, enable speech_mode on every chapter, and trigger a first analysis pass. Reversible. |
| `convert_from_speech` | Yes | Revert a speech book back to `story` (or another target type) and clear speech_mode on every chapter. |
| `list_revisions` | Yes | List revision history for a chapter, newest first. |
| `fetch_revision` | Yes | Fetch a single revision's full body (ProseMirror JSON + plain text). |
| `restore_revision` | Yes | Restore a chapter to a previous revision. Snapshots current body first so nothing is lost. |
| `list_speaker_notes` | Yes | List anchored speaker notes on a chapter, sorted by anchor position. |
| `create_speaker_note` | Yes | Create a speaker note anchored to a chapter text range. |

Example — run a full speech analysis on a chapter and print the delivery time:

```
mcp__civnode__speech_analysis({
  chapter_id: "8f3a...",
  audience_preset: "formal"
})
```

Example — convert an existing story book into a speech:

```
mcp__civnode__convert_to_speech({ book_id: "a1b2..." })
```

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
| `admin_toggle_strategist` | Toggle strategist role for a user (grants Civic Room access). |
| `admin_moderation_queue` | View flagged content awaiting review. |
| `admin_ai_providers` | List configured AI text providers. |
| `admin_ai_provider_keys` | List AI providers with partial API keys visible. |
| `admin_image_providers` | List image generation providers. |
| `admin_embedding_providers` | List embedding providers. |
| `admin_ai_usage` | AI token usage statistics. |
| `ai_usage_log` | Detailed AI usage log with filtering (date range, provider, action, local/cloud, success) and pagination. |
| `ai_usage_export` | Export AI usage data as CSV with the same filters. |
| `ai_pricing_list` | List AI pricing rules (per-model token and image prices). |
| `ai_pricing_upsert` | Create or update an AI pricing rule for a provider+model. |
| `ai_pricing_delete` | Delete an AI pricing rule by ID. |
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
| `admin_captcha_stats` | Captcha analytics: challenges, solve rates, country breakdown. |
| `admin_captcha_recent_failures` | Recent captcha failures with IP and country. |

### Civic Room (Admin / Strategist)

The Civic Room is a private workspace for platform strategists and admins to manage social media presence and coordinate.

| Tool | Description |
|------|-------------|
| `civic_room_get_notes` | Get your private Civic Room notes. |
| `civic_room_save_notes` | Save your private Civic Room notes. |
| `civic_room_overview` | Get overview: recent posts, threads, canvases. |
| `civic_room_threads` | List civic threads. |
| `civic_room_canvases` | List civic canvases. |
| `civic_room_list_channels` | List social media channels. |
| `civic_room_create_channel` | Create a social media channel. |
| `civic_room_update_channel` | Update a social media channel. |
| `civic_room_delete_channel` | Delete a social media channel. |
| `civic_room_list_posts` | List social media posts. Filter by state and channel. |
| `civic_room_create_post` | Create a social media post targeting multiple channels. |
| `civic_room_update_post` | Update a draft/queued post. |
| `civic_room_delete_post` | Delete a draft/queued post. |
| `civic_room_publish_post` | Publish a post immediately to its platform. |

---

## Examples

### Create a Screenplay

```javascript
create_book({
  title: "The Last Lighthouse",
  book_type: "screenplay",
  screenplay_format: "feature_film"
})
```

### Export a Screenplay as Final Draft (FDX)

```javascript
export_book({
  id: "book-uuid-here",
  format: "fdx"
})
```

### Export a Screenplay as Fountain

```javascript
export_book({
  id: "book-uuid-here",
  format: "fountain"
})
```

### Import a Fountain Screenplay

```javascript
import_fountain({
  text: "Title: The Last Lighthouse\nCredit: Written by\nAuthor: Jane Doe\n\nINT. LIGHTHOUSE - NIGHT\n\nA lone KEEPER tends the light."
})
```

### Get a Link Preview

```javascript
link_preview({
  url: "/books/abc-123/read"
})
```

### Browse the Library

```javascript
library_books()
```

### Fork a Library Book

```javascript
library_fork_book({
  book_id: "book-uuid-here"
})
```

### Create a Chapter Linked to a Plot Scene

```javascript
create_chapter({
  book_id: "book-uuid-here",
  title: "The Crossing",
  chapter_type: "chapter",
  plot_scene_id: "scene-uuid-here"
})
```

### Move a Plot Scene Between Acts

```javascript
update_plot_scene({
  plot_id: "plot-uuid-here",
  scene_id: "scene-uuid-here",
  act_id: "target-act-uuid",
  sort_order: 2
})
```

### Edit a Plot Scene's Summary

```javascript
update_plot_scene({
  plot_id: "plot-uuid-here",
  scene_id: "scene-uuid-here",
  summary: "Elena arrives at the lighthouse"
})
```

### Create a Beat Under a Scene

```javascript
create_plot_beat({
  plot_id: "plot-uuid-here",
  scene_id: "scene-uuid-here",
  title: "Elena spots the keeper's lantern",
  description: "First glimpse of another soul on the island.",
  beat_type: "reveal"
})
```

### Reorder Beats Within a Scene

```javascript
reorder_plot_beats({
  plot_id: "plot-uuid-here",
  scene_id: "scene-uuid-here",
  items: [
    { id: "beat-uuid-a", sort_order: 1 },
    { id: "beat-uuid-b", sort_order: 2 },
    { id: "beat-uuid-c", sort_order: 3 }
  ]
})
```

---

## Local Development

To run against a local CivNode instance:

```bash
CIVNODE_API_URL=http://localhost:9080 CIVNODE_SESSION_TOKEN=your-token npx @civnode/mcp
```

Or in your MCP client config:

```json
{
  "mcpServers": {
    "civnode-local": {
      "command": "npx",
      "args": ["-y", "@civnode/mcp"],
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
