#!/usr/bin/env node
/**
 * CivNode MCP Server
 *
 * The most advanced AI-powered creative writing platform, now accessible
 * to any AI assistant via MCP. Write novels, build richly detailed worlds,
 * develop characters with AI-generated profiles and portraits, collaborate
 * in real time, and publish to a community built on different principles —
 * no algorithm, no likes, no followers.
 *
 * 276 tools covering:
 * - Creative writing: works CRUD, series, AI feedback, title/summary suggestions
 * - World-building: characters, locations, creatures, plots, family trees (full CRUD + AI)
 * - Books: chapters, entity linking, cover generation, export
 * - Research & Observatory: semantic search, chapter analysis, writing insights
 * - Marketplace: browse, discover, and fork community creations
 * - Community: monuments, forums, letters, encounters, competitions, topics
 * - Collaboration: real-time co-writing, canvases, draft sharing
 * - Platform: messaging, groups, notifications, bookmarks, highlights, subscriptions
 * - Admin: system health, user management, moderation, bot simulation
 *
 * Usage:
 *   npx @civnode/mcp
 *
 * Claude Desktop config (~/.config/claude/claude_desktop_config.json):
 *   {
 *     "mcpServers": {
 *       "civnode": {
 *         "command": "npx",
 *         "args": ["-y", "@civnode/mcp"],
 *         "env": {
 *           "CIVNODE_SESSION_TOKEN": "your-session-token"
 *         }
 *       }
 *     }
 *   }
 *
 * Public tools work without authentication. For authenticated operations
 * (publishing, messaging, subscription management), provide a session token.
 * Admin tools are gated behind the session token — they only appear when
 * a token is configured and require server-side admin role.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const API_BASE = process.env.CIVNODE_API_URL || "https://civnode.com";
const sessionToken = process.env.CIVNODE_SESSION_TOKEN || null;

// ─── HTTP helpers ───

function authHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (sessionToken) {
    headers["Authorization"] = `Bearer ${sessionToken}`;
  }
  return headers;
}

async function fetchAPI(path) {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders() });
  return handleResponse(res);
}

async function postAPI(path, body = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

async function putAPI(path, body = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

async function deleteAPI(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
}

async function patchAPI(path, body = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

async function handleResponse(res) {
  if (res.status === 204) return { ok: true };
  if (res.status === 401) {
    throw new Error(
      "Authentication required. Set CIVNODE_SESSION_TOKEN environment variable."
    );
  }
  if (res.status === 403) {
    throw new Error("Forbidden — you don't have permission for this action.");
  }
  if (res.status === 429) {
    throw new Error("Rate limit exceeded. Please wait before retrying.");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error: ${res.status} ${res.statusText} ${text}`);
  }
  return await res.json();
}

// ─── Server ───

const server = new Server(
  { name: "civnode", version: "2.4.0" },
  { capabilities: { tools: {} } }
);

// ─── Tool Definitions ───

const tools = [
  // ── Monuments ──
  {
    name: "get_random_monument",
    description:
      "Get a random Monument from the CivNode frontpage. Each user has exactly one Monument — their single page on the platform. Optionally filter by mood.",
    inputSchema: {
      type: "object",
      properties: {
        mood_tags: {
          type: "array",
          items: { type: "string" },
          description:
            "Filter by moods: soothing, inspiring, provocative, melancholic, playful, urgent, contemplative, raw",
        },
      },
    },
    handler: (args) => {
      let path = "/api/monuments/random";
      if (args.mood_tags?.length) {
        path += `?mood=${encodeURIComponent(args.mood_tags.join(","))}`;
      }
      return fetchAPI(path);
    },
  },
  {
    name: "get_monument",
    description: "Read a specific Monument by its UUID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Monument UUID" },
      },
      required: ["id"],
    },
    handler: (args) => fetchAPI(`/api/monuments/${args.id}`),
  },
  {
    name: "get_monument_by_alias",
    description:
      "Read a user's Monument by their alias. Every user has exactly one Monument.",
    inputSchema: {
      type: "object",
      properties: {
        alias: { type: "string", description: "User alias" },
      },
      required: ["alias"],
    },
    handler: (args) =>
      fetchAPI(`/api/users/${encodeURIComponent(args.alias)}/monument`),
  },
  {
    name: "publish_monument",
    description:
      "Publish or update your Monument. Each user has exactly one. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Monument title (max 100 chars)",
        },
        body_markdown: {
          type: "string",
          description: "Monument content in Markdown (max 5000 words)",
        },
        sources: {
          type: "array",
          items: { type: "string" },
          description: "Source URLs (max 5, must be http/https)",
        },
        identity_mode: {
          type: "string",
          description: "Identity: alias, real_name, or incognito (default: alias)",
        },
        author_note: {
          type: "string",
          description: "Optional note about what changed (max 500 chars, stored in version history)",
        },
      },
      required: ["title", "body_markdown"],
    },
    handler: (args) =>
      postAPI("/api/monuments", {
        title: args.title,
        body_markdown: args.body_markdown,
        sources: args.sources || [],
        identity_mode: args.identity_mode || "alias",
        author_note: args.author_note || "",
      }),
  },
  {
    name: "resonate",
    description:
      "Leave resonance (quiet appreciation) on a Monument or published work. CivNode's alternative to likes — no counts shown, just a private acknowledgment. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        content_type: {
          type: "string",
          enum: ["monument", "work"],
          description: "Type of content to resonate with",
        },
        content_id: {
          type: "string",
          description: "UUID of the monument or work",
        },
      },
      required: ["content_type", "content_id"],
    },
    handler: (args) => {
      if (args.content_type === "monument") {
        return postAPI(`/api/monuments/${args.content_id}/resonate`);
      }
      return postAPI(`/api/writing/${args.content_id}/resonate`);
    },
  },

  // ── Monument Sharing ──
  {
    name: "monument_share_preview",
    description:
      "Get a preview of the text that will be shared when posting your Monument to social media. Requires authentication and active supporter subscription (returns 403 for free users).",
    inputSchema: { type: "object", properties: {} },
    handler: () => fetchAPI("/api/monument/share/preview"),
  },
  {
    name: "monument_share",
    description:
      "Share your Monument to connected social media platforms (Bluesky, Mastodon). Requires authentication, active supporter subscription, and at least one connected social account.",
    inputSchema: {
      type: "object",
      properties: {
        platforms: {
          type: "array",
          items: { type: "string", enum: ["bluesky", "mastodon"] },
          description: "Platforms to share to",
        },
        text: {
          type: "string",
          description: "Custom share text (optional, uses auto-generated preview if omitted)",
        },
      },
      required: ["platforms"],
    },
    handler: (args) =>
      postAPI("/api/monument/share", {
        platforms: args.platforms,
        text: args.text || "",
      }),
  },

  // ── Showcase ──
  {
    name: "showcase_list",
    description:
      "Get a user's public showcase — the curated list of books, works, and collections they have chosen to share. Supports search, filtering by type, and pagination.",
    inputSchema: {
      type: "object",
      properties: {
        alias: { type: "string", description: "User alias" },
        q: { type: "string", description: "Search by title (optional)" },
        type: {
          type: "string",
          description: "Filter by item type: book, work, collection (optional)",
        },
        sort: { type: "string", description: "Sort order (optional)" },
        limit: { type: "integer", description: "Max items (default 50, max 100)" },
        offset: { type: "integer", description: "Pagination offset (default 0)" },
      },
      required: ["alias"],
    },
    handler: (args) => {
      const alias = encodeURIComponent(args.alias);
      const params = new URLSearchParams();
      if (args.q) params.set("q", args.q);
      if (args.type) params.set("type", args.type);
      if (args.sort) params.set("sort", args.sort);
      if (args.limit) params.set("limit", String(args.limit));
      if (args.offset) params.set("offset", String(args.offset));
      const qs = params.toString();
      return fetchAPI(`/api/users/${alias}/showcase${qs ? "?" + qs : ""}`);
    },
  },
  {
    name: "showcase_count",
    description:
      "Get the number of items in a user's public showcase.",
    inputSchema: {
      type: "object",
      properties: {
        alias: { type: "string", description: "User alias" },
      },
      required: ["alias"],
    },
    handler: (args) =>
      fetchAPI(`/api/users/${encodeURIComponent(args.alias)}/showcase/count`),
  },
  {
    name: "showcase_add",
    description:
      "Add a book, work, or collection to your public showcase. Exactly one of book_id, work_id, or collection_id must be provided. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        book_id: { type: "string", description: "Book UUID (provide exactly one ID)" },
        work_id: { type: "string", description: "Work UUID (provide exactly one ID)" },
        collection_id: {
          type: "string",
          description: "Collection UUID (provide exactly one ID)",
        },
        author_note: {
          type: "string",
          description: "Optional note about the item (max 280 chars)",
        },
      },
    },
    handler: (args) => {
      const body = {};
      if (args.book_id) body.book_id = args.book_id;
      if (args.work_id) body.work_id = args.work_id;
      if (args.collection_id) body.collection_id = args.collection_id;
      if (args.author_note) body.author_note = args.author_note;
      return postAPI("/api/showcase", body);
    },
  },
  {
    name: "showcase_mine",
    description:
      "List your own showcase items. Returns all items you have added to your public showcase. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: () => fetchAPI("/api/showcase/mine"),
  },
  {
    name: "showcase_update_note",
    description:
      "Update the author note on a showcase item. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Showcase item UUID" },
        author_note: {
          type: "string",
          description: "New note (max 280 chars). Send empty string to clear.",
        },
      },
      required: ["id"],
    },
    handler: (args) =>
      patchAPI(`/api/showcase/${args.id}`, {
        author_note: args.author_note || "",
      }),
  },
  {
    name: "showcase_remove",
    description:
      "Retract an item from your public showcase. The item remains in My Writing but is no longer publicly visible. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Showcase item UUID" },
      },
      required: ["id"],
    },
    handler: (args) => deleteAPI(`/api/showcase/${args.id}`),
  },
  {
    name: "showcase_reorder",
    description:
      "Set the display order of your showcase items by providing item IDs in the desired order. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        item_ids: {
          type: "array",
          items: { type: "string" },
          description: "Showcase item UUIDs in desired display order",
        },
      },
      required: ["item_ids"],
    },
    handler: (args) =>
      putAPI("/api/showcase/reorder", { item_ids: args.item_ids }),
  },

  // ── Letters ──
  {
    name: "send_letter",
    description:
      "Send an anonymous letter to a Monument author. Letters are CivNode's way of responding to someone's work — anonymous until the author chooses to reveal. Max 500 words. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        monument_id: {
          type: "string",
          description: "UUID of the monument to send the letter to",
        },
        body: {
          type: "string",
          description: "Letter content (max 500 words)",
        },
      },
      required: ["monument_id", "body"],
    },
    handler: (args) =>
      postAPI(`/api/monuments/${args.monument_id}/letter`, {
        body: args.body,
      }),
  },
  {
    name: "get_public_letters",
    description:
      "Get publicly displayed letters on a user's Monument. Only shows letters the author chose to display.",
    inputSchema: {
      type: "object",
      properties: {
        alias: { type: "string", description: "Monument owner's alias" },
      },
      required: ["alias"],
    },
    handler: (args) =>
      fetchAPI(`/api/users/${encodeURIComponent(args.alias)}/letters`),
  },

  // ── Writing ──
  {
    name: "browse_writing",
    description:
      "Browse published creative works on CivNode. Returns works in random order. Filter by literary form or mood.",
    inputSchema: {
      type: "object",
      properties: {
        form: {
          type: "string",
          description:
            "Filter by form: poem, short_story, essay, novella, serial_chapter, note, blog_post, other",
        },
        mood: {
          type: "string",
          description:
            "Filter by mood: soothing, inspiring, provocative, melancholic, playful, urgent, contemplative, raw",
        },
        limit: {
          type: "integer",
          description: "Number of works to return (default 20, max 50)",
        },
      },
    },
    handler: (args) => {
      const params = new URLSearchParams();
      if (args.form) params.set("form", args.form);
      if (args.mood) params.set("mood", args.mood);
      if (args.limit) params.set("limit", String(args.limit));
      const qs = params.toString();
      return fetchAPI(`/api/writing/browse${qs ? "?" + qs : ""}`);
    },
  },
  {
    name: "get_work",
    description: "Read a specific creative writing piece by its UUID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Work UUID" },
      },
      required: ["id"],
    },
    handler: (args) => fetchAPI(`/api/writing/${args.id}`),
  },
  {
    name: "search_writing",
    description: "Search published creative works by keyword (full-text search).",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Search query" },
        limit: { type: "integer", description: "Max results (default 20)" },
      },
      required: ["q"],
    },
    handler: (args) => {
      const params = new URLSearchParams({ q: args.q });
      if (args.limit) params.set("limit", String(args.limit));
      return fetchAPI(`/api/writing/search?${params}`);
    },
  },
  {
    name: "publish_work",
    description:
      "Publish a creative writing piece. Requires blog to be enabled in settings. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Work title (max 200 chars)" },
        body_markdown: {
          type: "string",
          description: "Work content in Markdown (max 50000 words)",
        },
        form: {
          type: "string",
          description:
            "Literary form: poem, short_story, essay, novella, serial_chapter, note, blog_post, other",
        },
        mood_tags: {
          type: "array",
          items: { type: "string" },
          description: "1-3 mood tags",
        },
        identity_mode: {
          type: "string",
          description: "Identity: alias, real_name, or incognito (default: alias)",
        },
      },
      required: ["title", "body_markdown", "form"],
    },
    handler: (args) =>
      postAPI("/api/writing", {
        title: args.title,
        body_markdown: args.body_markdown,
        form: args.form,
        mood_tags: args.mood_tags || [],
        identity_mode: args.identity_mode || "alias",
      }),
  },
  {
    name: "get_series",
    description: "Get a writing series with all its works in reading order.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Series UUID" },
      },
      required: ["id"],
    },
    handler: (args) => fetchAPI(`/api/writing/series/${args.id}`),
  },

  // ── Forum ──
  {
    name: "forum_list_threads",
    description:
      "List threads in a user's forum. Every user on CivNode has their own forum.",
    inputSchema: {
      type: "object",
      properties: {
        alias: { type: "string", description: "Forum owner's alias" },
        limit: { type: "integer", description: "Max threads (default 20)" },
      },
      required: ["alias"],
    },
    handler: (args) => {
      const alias = encodeURIComponent(args.alias);
      const limit = args.limit || 20;
      return fetchAPI(`/api/forum/${alias}/threads?limit=${limit}`);
    },
  },
  {
    name: "forum_read_thread",
    description: "Read a forum thread with all its posts.",
    inputSchema: {
      type: "object",
      properties: {
        thread_id: { type: "string", description: "Thread UUID" },
      },
      required: ["thread_id"],
    },
    handler: (args) => fetchAPI(`/api/forum/threads/${args.thread_id}`),
  },
  {
    name: "forum_search",
    description: "Search threads in a user's forum by keyword.",
    inputSchema: {
      type: "object",
      properties: {
        alias: { type: "string", description: "Forum owner's alias" },
        q: { type: "string", description: "Search query" },
      },
      required: ["alias", "q"],
    },
    handler: (args) => {
      const alias = encodeURIComponent(args.alias);
      return fetchAPI(
        `/api/forum/${alias}/search?q=${encodeURIComponent(args.q)}`
      );
    },
  },
  {
    name: "forum_post",
    description:
      "Create a new thread or reply to an existing one. Provide thread_id to reply, or forum_alias + title to create a new thread. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        forum_alias: {
          type: "string",
          description: "Forum owner's alias (for new threads)",
        },
        title: {
          type: "string",
          description: "Thread title (required for new threads)",
        },
        content: {
          type: "string",
          description: "Post content in Markdown",
        },
        thread_id: {
          type: "string",
          description: "Thread UUID (for replies)",
        },
      },
      required: ["content"],
    },
    handler: (args) => {
      if (args.thread_id) {
        return postAPI(`/api/forum/threads/${args.thread_id}/posts`, {
          body_markdown: args.content,
        });
      }
      const alias = encodeURIComponent(args.forum_alias);
      return postAPI(`/api/forum/${alias}/threads`, {
        title: args.title,
        body_markdown: args.content,
      });
    },
  },

  // ── Site Forum ──
  {
    name: "forum_site_categories",
    description:
      "List all categories in the CivNode site-wide forum. No authentication required.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: () => fetchAPI(`/api/forum/site/categories`),
  },
  {
    name: "forum_site_threads",
    description:
      "List threads in the CivNode site-wide forum. Optionally filter by category. No authentication required.",
    inputSchema: {
      type: "object",
      properties: {
        category_id: {
          type: "string",
          description: "Filter by category UUID (optional)",
        },
        cursor: {
          type: "string",
          description: "Pagination cursor from a previous response (optional)",
        },
      },
    },
    handler: (args) => {
      const params = new URLSearchParams();
      if (args.category_id) params.set("category_id", args.category_id);
      if (args.cursor) params.set("cursor", args.cursor);
      const qs = params.toString();
      return fetchAPI(`/api/forum/site/threads${qs ? "?" + qs : ""}`);
    },
  },
  {
    name: "forum_site_create_thread",
    description:
      "Create a new thread in the CivNode site-wide forum. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Thread title" },
        body_markdown: {
          type: "string",
          description: "Opening post content in Markdown",
        },
        category_id: {
          type: "string",
          description: "Category UUID to post in",
        },
      },
      required: ["title", "body_markdown"],
    },
    handler: (args) =>
      postAPI(`/api/forum/site/threads`, {
        title: args.title,
        body_markdown: args.body_markdown,
        category_id: args.category_id,
      }),
  },

  // ── Profiles ──
  {
    name: "get_profile",
    description:
      "Get a user's public profile including alias, first words, supporter status, join date, and content counts.",
    inputSchema: {
      type: "object",
      properties: {
        alias: { type: "string", description: "User alias" },
      },
      required: ["alias"],
    },
    handler: (args) =>
      fetchAPI(`/api/users/${encodeURIComponent(args.alias)}`),
  },
  {
    name: "update_tagline",
    description:
      "Update your profile tagline (up to 200 characters). Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        tagline: {
          type: "string",
          description: "Profile tagline text (max 200 chars)",
        },
      },
      required: ["tagline"],
    },
    handler: (args) =>
      putAPI("/api/users/tagline", { tagline: args.tagline }),
  },
  {
    name: "get_social_links",
    description:
      "Get a user's social links (X/Twitter, Bluesky, Mastodon, etc.). Public — no authentication required.",
    inputSchema: {
      type: "object",
      properties: {
        alias: { type: "string", description: "User alias" },
      },
      required: ["alias"],
    },
    handler: (args) =>
      fetchAPI(`/api/users/${encodeURIComponent(args.alias)}/social-links`),
  },
  {
    name: "update_social_links",
    description:
      "Update your social links. Provide the full list of links — this replaces all existing links. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        links: {
          type: "array",
          description: "Array of social link objects",
          items: {
            type: "object",
            properties: {
              link_type: {
                type: "string",
                description:
                  "Link type: twitter, bluesky, mastodon, instagram, youtube, linkedin, website, custom",
              },
              url: { type: "string", description: "Full URL" },
              label: {
                type: "string",
                description:
                  "Display label (optional, used for custom links)",
              },
              display_order: {
                type: "integer",
                description: "Sort order (0-based)",
              },
            },
            required: ["link_type", "url"],
          },
        },
      },
      required: ["links"],
    },
    handler: (args) =>
      putAPI("/api/users/social-links", { links: args.links }),
  },
  {
    name: "update_avatar_source",
    description:
      "Set your avatar source: goavatar (procedurally generated), gravatar (email-linked), or custom (uploaded image). Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        source: {
          type: "string",
          enum: ["goavatar", "gravatar", "custom"],
          description: "Avatar source type",
        },
      },
      required: ["source"],
    },
    handler: (args) =>
      putAPI("/api/users/avatar-source", { source: args.source }),
  },

  // ── Messaging ──
  {
    name: "send_message",
    description:
      "Send a message in an existing conversation. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        conversation_id: {
          type: "string",
          description: "Conversation UUID",
        },
        content: {
          type: "string",
          description: "Message content (max 10000 chars)",
        },
      },
      required: ["conversation_id", "content"],
    },
    handler: (args) =>
      postAPI(
        `/api/messages/conversations/${args.conversation_id}/messages`,
        { content: args.content }
      ),
  },
  {
    name: "list_conversations",
    description:
      "List your conversations with latest message preview. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          description: "Max conversations (default 20)",
        },
      },
    },
    handler: (args) => {
      const limit = args.limit || 20;
      return fetchAPI(`/api/messages/conversations?limit=${limit}`);
    },
  },
  {
    name: "read_conversation",
    description:
      "Read messages in a conversation. Returns newest first. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        conversation_id: {
          type: "string",
          description: "Conversation UUID",
        },
        limit: {
          type: "integer",
          description: "Max messages (default 50)",
        },
      },
      required: ["conversation_id"],
    },
    handler: (args) => {
      const limit = args.limit || 50;
      return fetchAPI(
        `/api/messages/conversations/${args.conversation_id}/messages?limit=${limit}`
      );
    },
  },

  // ── Competitions ──
  {
    name: "list_competitions",
    description:
      "List writing competitions. Optionally filter by phase: signup, writing, voting, completed, cancelled.",
    inputSchema: {
      type: "object",
      properties: {
        phase: {
          type: "string",
          description: "Filter by phase: signup, writing, voting, completed, cancelled",
        },
        limit: {
          type: "integer",
          description: "Max results (default 50)",
        },
      },
    },
    handler: (args) => {
      const params = new URLSearchParams();
      if (args.phase) params.set("phase", args.phase);
      if (args.limit) params.set("limit", String(args.limit));
      const qs = params.toString();
      return fetchAPI(`/api/competitions${qs ? "?" + qs : ""}`);
    },
  },
  {
    name: "get_competition",
    description:
      "Get details for a specific competition including signup/entry/vote counts. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Competition UUID" },
      },
      required: ["id"],
    },
    handler: (args) => fetchAPI(`/api/competitions/${args.id}`),
  },
  {
    name: "create_competition",
    description:
      "Create a new writing competition. Requires supporter status. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Competition title (max 200 chars)",
        },
        prompt: {
          type: "string",
          description: "Writing prompt for participants",
        },
        form_constraint: {
          type: "string",
          description: "Required form: poem, short_story, essay, or any (default: any)",
        },
        word_limit: {
          type: "integer",
          description: "Max words per entry (500-20000, default: 5000)",
        },
        min_participants: {
          type: "integer",
          description: "Minimum signups to proceed (min 5, default: 5)",
        },
        runners_up_count: {
          type: "integer",
          description: "Number of runners-up to highlight (default: 2)",
        },
        signup_duration_days: {
          type: "integer",
          description: "Days for signup phase (default: 7)",
        },
        writing_duration_days: {
          type: "integer",
          description: "Days for writing phase (default: 14)",
        },
        voting_duration_days: {
          type: "integer",
          description: "Days for voting phase (default: 7)",
        },
      },
      required: ["title", "prompt"],
    },
    handler: (args) =>
      postAPI("/api/competitions", {
        title: args.title,
        prompt: args.prompt,
        form_constraint: args.form_constraint || "any",
        word_limit: args.word_limit || 5000,
        min_participants: args.min_participants || 5,
        runners_up_count: args.runners_up_count || 2,
        signup_duration_days: args.signup_duration_days || 7,
        writing_duration_days: args.writing_duration_days || 14,
        voting_duration_days: args.voting_duration_days || 7,
      }),
  },
  {
    name: "competition_signup",
    description:
      "Sign up for a competition (signup phase only). The creator cannot enter their own competition. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Competition UUID" },
      },
      required: ["id"],
    },
    handler: (args) =>
      postAPI(`/api/competitions/${args.id}/signup`),
  },
  {
    name: "competition_submit_entry",
    description:
      "Submit or update your entry for a competition (writing phase only). Must be signed up. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Competition UUID" },
        body_markdown: {
          type: "string",
          description: "Entry content in Markdown (must be within the competition word limit)",
        },
      },
      required: ["id", "body_markdown"],
    },
    handler: (args) =>
      postAPI(`/api/competitions/${args.id}/entry`, {
        body: args.body_markdown,
      }),
  },
  {
    name: "competition_vote",
    description:
      "Cast your vote in a competition (voting phase only). Pick your top 3 entries. First pick gets 3 points, second gets 2, third gets 1. Cannot vote for your own entry. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Competition UUID" },
        first_pick: {
          type: "string",
          description: "Entry UUID for 1st place (3 points)",
        },
        second_pick: {
          type: "string",
          description: "Entry UUID for 2nd place (2 points)",
        },
        third_pick: {
          type: "string",
          description: "Entry UUID for 3rd place (1 point)",
        },
      },
      required: ["id", "first_pick", "second_pick", "third_pick"],
    },
    handler: (args) =>
      postAPI(`/api/competitions/${args.id}/vote`, {
        first_pick: args.first_pick,
        second_pick: args.second_pick,
        third_pick: args.third_pick,
      }),
  },
  {
    name: "competition_entries",
    description:
      "Get blind entries for a competition (voting or completed phase). Author info is hidden during voting.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Competition UUID" },
      },
      required: ["id"],
    },
    handler: (args) =>
      fetchAPI(`/api/competitions/${args.id}/entries`),
  },
  {
    name: "competition_results",
    description:
      "Get ranked results for a completed competition. Shows authors, points, and rankings.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Competition UUID" },
      },
      required: ["id"],
    },
    handler: (args) =>
      fetchAPI(`/api/competitions/${args.id}/results`),
  },

  // ── Groups ──
  {
    name: "list_groups",
    description:
      "List groups you are a member of. Requires authentication.",
    inputSchema: { type: "object", properties: {} },
    handler: () => fetchAPI("/api/groups"),
  },
  {
    name: "create_group",
    description:
      "Create a new writing group. The caller becomes the owner. Group types: critique (structured cycles), accountability (goals and check-ins), workshop (open critique), co_writing (shared projects), sprint (timed sessions). Defaults to critique. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Group name (required)" },
        description: { type: "string", description: "Short description of the group" },
        group_type: {
          type: "string",
          enum: ["critique", "accountability", "workshop", "co_writing", "sprint"],
          description: "Type of writing group. Defaults to critique.",
        },
      },
      required: ["name"],
    },
    handler: (args) =>
      postAPI("/api/groups", {
        name: args.name,
        description: args.description,
        group_type: args.group_type,
      }),
  },
  {
    name: "delete_group",
    description:
      "Delete a writing group. Only the owner may delete a group. This permanently removes the group, all cycles, submissions, critiques, and chat rooms. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Group UUID (required)" },
      },
      required: ["id"],
    },
    handler: (args) => deleteAPI(`/api/groups/${args.id}`),
  },
  {
    name: "get_group",
    description:
      "Get details for a specific group. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Group UUID" },
      },
      required: ["id"],
    },
    handler: (args) => fetchAPI(`/api/groups/${args.id}`),
  },
  {
    name: "group_update",
    description:
      "Update a group's name and description. Only the owner and leaders may update group details. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Group UUID (required)" },
        name: { type: "string", description: "New group name" },
        description: { type: "string", description: "New group description" },
      },
      required: ["id"],
    },
    handler: (args) => putAPI(`/api/groups/${args.id}`, { name: args.name, description: args.description }),
  },
  {
    name: "group_settings_get",
    description:
      "Get the feature settings for a specific group. Caller must be a member. Returns settings such as submissions_enabled, reciprocity_mode, cycles_enabled, etc. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Group UUID" },
      },
      required: ["id"],
    },
    handler: (args) => fetchAPI(`/api/groups/${args.id}/settings`),
  },
  {
    name: "group_settings_update",
    description:
      "Update the feature settings for a group. Only the group creator can update settings. Accepts any subset of settings keys. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Group UUID" },
        submissions_enabled: { type: "boolean", description: "Enable work submissions" },
        reciprocity_mode: { type: "string", enum: ["enforced", "visible", "none"], description: "Feedback balance tracking mode" },
        silent_period_enabled: { type: "boolean", description: "Silent reading period before discussion" },
        cycles_enabled: { type: "boolean", description: "Structured critique cycles" },
        critique_templates_enabled: { type: "boolean", description: "Guided feedback form templates" },
        goals_enabled: { type: "boolean", description: "Personal writing goal tracking" },
        sprints_enabled: { type: "boolean", description: "Timed writing sprints" },
        challenges_enabled: { type: "boolean", description: "Group writing challenges" },
        project_tracking_enabled: { type: "boolean", description: "Shared project/chapter tracking board" },
        directory_listed: { type: "boolean", description: "Show group in public directory" },
        member_cap: { type: "integer", description: "Maximum number of members (2-100)" },
      },
      required: ["id"],
    },
    handler: (args) => {
      const { id, ...settings } = args;
      return putAPI(`/api/groups/${id}/settings`, settings);
    },
  },

  // ── Group Moderation ──
  {
    name: "group_add_member",
    description:
      "Add a user to a group by user_id. Only the owner and leaders may add members directly. For public groups with directory listing enabled, users can also apply via group_apply. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Group UUID (required)" },
        user_id: { type: "string", description: "User UUID to add (required)" },
      },
      required: ["id", "user_id"],
    },
    handler: (args) => postAPI(`/api/groups/${args.id}/members`, { user_id: args.user_id }),
  },
  {
    name: "group_remove_member",
    description:
      "Remove a member from a group. The owner and leaders may remove any non-owner member. Members may remove themselves (leave). Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Group UUID (required)" },
        user_id: { type: "string", description: "User UUID to remove (required)" },
      },
      required: ["id", "user_id"],
    },
    handler: (args) => deleteAPI(`/api/groups/${args.id}/members/${args.user_id}`),
  },
  {
    name: "group_list_members",
    description:
      "List all members of a group with their roles (owner, leader, moderator, member). Caller must be a group member. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Group UUID" },
      },
      required: ["id"],
    },
    handler: (args) => fetchAPI(`/api/groups/${args.id}/members`),
  },
  {
    name: "group_promote_member",
    description:
      "Promote or demote a group member to a new role. Valid roles: leader, moderator, member. The owner can promote to any role; leaders can promote members to moderator only. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Group UUID" },
        user_id: { type: "string", description: "User UUID of the member to change" },
        role: { type: "string", enum: ["leader", "moderator", "member"], description: "New role to assign" },
      },
      required: ["id", "user_id", "role"],
    },
    handler: (args) => putAPI(`/api/groups/${args.id}/members/${args.user_id}/role`, { role: args.role }),
  },
  {
    name: "group_transfer_ownership",
    description:
      "Transfer group ownership to another member. Only the current owner can call this. The previous owner becomes a leader. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Group UUID" },
        user_id: { type: "string", description: "User UUID of the member to become owner" },
      },
      required: ["id", "user_id"],
    },
    handler: (args) => postAPI(`/api/groups/${args.id}/transfer`, { user_id: args.user_id }),
  },
  {
    name: "group_warn_member",
    description:
      "Issue a warning to a group member. A reason is required. Returns the warning object including the strike number. Moderators, leaders, and the owner can warn members. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Group UUID" },
        user_id: { type: "string", description: "User UUID of the member to warn" },
        reason: { type: "string", description: "Reason for the warning" },
      },
      required: ["id", "user_id", "reason"],
    },
    handler: (args) => postAPI(`/api/groups/${args.id}/members/${args.user_id}/warn`, { reason: args.reason }),
  },
  {
    name: "group_list_warnings",
    description:
      "List warnings issued to a specific member. Accessible by moderators, leaders, and the owner, or by the member themselves. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Group UUID" },
        user_id: { type: "string", description: "User UUID of the member" },
      },
      required: ["id", "user_id"],
    },
    handler: (args) => fetchAPI(`/api/groups/${args.id}/members/${args.user_id}/warnings`),
  },
  {
    name: "group_ban_member",
    description:
      "Ban a member from a group. The member is removed immediately and cannot rejoin unless unbanned. A reason is required. Leaders and the owner can ban. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Group UUID" },
        user_id: { type: "string", description: "User UUID of the member to ban" },
        reason: { type: "string", description: "Reason for the ban" },
      },
      required: ["id", "user_id", "reason"],
    },
    handler: (args) => postAPI(`/api/groups/${args.id}/members/${args.user_id}/ban`, { reason: args.reason }),
  },
  {
    name: "group_unban_member",
    description:
      "Remove a ban on a user, allowing them to rejoin the group. Only the owner can unban. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Group UUID" },
        user_id: { type: "string", description: "User UUID of the banned member" },
      },
      required: ["id", "user_id"],
    },
    handler: (args) => deleteAPI(`/api/groups/${args.id}/bans/${args.user_id}`),
  },
  {
    name: "group_list_bans",
    description:
      "List all currently banned members of a group. Only accessible by the owner and leaders. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Group UUID" },
      },
      required: ["id"],
    },
    handler: (args) => fetchAPI(`/api/groups/${args.id}/bans`),
  },
  {
    name: "group_report",
    description:
      "Report a group or a specific member for a rules violation. Any group member can submit a report. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Group UUID" },
        reason: { type: "string", description: "Description of the issue" },
        target_user_id: { type: "string", description: "Optional: UUID of the specific member being reported" },
      },
      required: ["id", "reason"],
    },
    handler: (args) => {
      const body = { reason: args.reason };
      if (args.target_user_id) body.target_user_id = args.target_user_id;
      return postAPI(`/api/groups/${args.id}/report`, body);
    },
  },
  {
    name: "group_list_rooms",
    description:
      "List all messaging rooms (sub-channels) in a group. The caller must be a group member. Rooms include General, Submissions, and Off-topic by default. Each room has a conversation_id used for sending and reading messages. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Group UUID" },
      },
      required: ["id"],
    },
    handler: (args) => fetchAPI(`/api/groups/${args.id}/rooms`),
  },
  {
    name: "group_create_room",
    description:
      "Create a custom messaging room in a group. Only owners and leaders may create rooms. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Group UUID" },
        name: { type: "string", description: "Room name (e.g. 'Feedback')" },
      },
      required: ["id", "name"],
    },
    handler: (args) => postAPI(`/api/groups/${args.id}/rooms`, { name: args.name }),
  },
  {
    name: "group_delete_room",
    description:
      "Delete a custom room from a group. Only owners and leaders may delete rooms. The General room cannot be deleted. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Group UUID" },
        room_id: { type: "string", description: "Room UUID" },
      },
      required: ["id", "room_id"],
    },
    handler: (args) => deleteAPI(`/api/groups/${args.id}/rooms/${args.room_id}`),
  },
  {
    name: "group_activity",
    description:
      "Fetch the activity feed for a group. Returns a chronological list of events: submissions, critiques, members joining/leaving, role changes, sprints, and cycle events. Supports pagination via limit and offset. The caller must be a group member. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Group UUID" },
        limit: { type: "number", description: "Max events to return (default 20, max 50)" },
        offset: { type: "number", description: "Pagination offset (default 0)" },
      },
      required: ["id"],
    },
    handler: (args) => {
      const params = new URLSearchParams();
      if (args.limit) params.set("limit", args.limit);
      if (args.offset) params.set("offset", args.offset);
      const qs = params.toString();
      return fetchAPI(`/api/groups/${args.id}/activity${qs ? "?" + qs : ""}`);
    },
  },
  {
    name: "group_forum_threads",
    description:
      "List forum threads in a group's private forum. Threads are visible to all group members. Returns title, author, reply count, and timestamps. Supports cursor-based pagination. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Group UUID" },
        limit: { type: "number", description: "Max threads to return (default 20, max 20)" },
        cursor: { type: "string", description: "ISO 8601 timestamp for cursor-based pagination" },
      },
      required: ["id"],
    },
    handler: (args) => {
      const params = new URLSearchParams();
      if (args.limit) params.set("limit", args.limit);
      if (args.cursor) params.set("cursor", args.cursor);
      const qs = params.toString();
      return fetchAPI(`/api/groups/${args.id}/forum/threads${qs ? "?" + qs : ""}`);
    },
  },
  {
    name: "group_forum_create_thread",
    description:
      "Create a new thread in a group's private forum. The caller must be a group member. Returns the created thread including its ID, which can be used to navigate to /forum/{id}. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Group UUID" },
        title: { type: "string", description: "Thread title" },
        body_markdown: { type: "string", description: "Opening post body (Markdown)" },
      },
      required: ["id", "title"],
    },
    handler: (args) => postAPI(`/api/groups/${args.id}/forum/threads`, {
      title: args.title,
      body_markdown: args.body_markdown || "",
    }),
  },

  // ── Group critique cycles ──
  {
    name: "group_start_cycle",
    description:
      "Start a new critique cycle for a group. The caller must be the owner or a leader. Returns the new cycle object including its ID, cycle number, phase timestamps, and status. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Group UUID" },
      },
      required: ["id"],
    },
    handler: (args) => postAPI(`/api/groups/${args.id}/cycles`, {}),
  },
  {
    name: "group_list_cycles",
    description:
      "List all critique cycles for a group, most recent first. The caller must be a member. Returns cycle objects with phase timestamps and current status. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Group UUID" },
      },
      required: ["id"],
    },
    handler: (args) => fetchAPI(`/api/groups/${args.id}/cycles`),
  },
  {
    name: "group_current_cycle",
    description:
      "Get the current (most recent non-completed) critique cycle for a group. Returns 404 if no active cycle. The caller must be a member. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Group UUID" },
      },
      required: ["id"],
    },
    handler: (args) => fetchAPI(`/api/groups/${args.id}/cycles/current`),
  },
  {
    name: "group_submit_work",
    description:
      "Submit work to the current critique cycle. The group must be in the submission phase. Each member may submit once per cycle. Returns the submission object. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Group UUID" },
        title: { type: "string", description: "Submission title" },
        body_json: { type: "object", description: "ProseMirror document JSON" },
        word_count: { type: "integer", description: "Word count of the submission" },
        work_id: { type: "string", description: "Optional: UUID of a linked work in the user's library" },
        chapter_id: { type: "string", description: "Optional: UUID of a linked chapter" },
      },
      required: ["id", "title"],
    },
    handler: (args) => postAPI(`/api/groups/${args.id}/submissions`, {
      title: args.title,
      body_json: args.body_json || { type: "doc", content: [] },
      word_count: args.word_count || 0,
      work_id: args.work_id,
      chapter_id: args.chapter_id,
    }),
  },
  {
    name: "group_list_cycle_submissions",
    description:
      "List all submissions for a specific cycle. The caller must be a member. Returns submission objects including title, author alias, word count, and body JSON. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Group UUID" },
        cycle_id: { type: "string", description: "Cycle UUID" },
      },
      required: ["id", "cycle_id"],
    },
    handler: (args) => fetchAPI(`/api/groups/${args.id}/cycles/${args.cycle_id}/submissions`),
  },
  {
    name: "group_get_submission",
    description:
      "Get a single submission by its UUID. The caller must be a member of the group the submission belongs to. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Submission UUID" },
      },
      required: ["id"],
    },
    handler: (args) => fetchAPI(`/api/groups/submissions/${args.id}`),
  },
  {
    name: "group_record_critique",
    description:
      "Record a critique against a submission. The group must be in the critique phase. The critic cannot be the submission author. Returns the critique object. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Submission UUID" },
        inline_comment_count: { type: "integer", description: "Number of inline comments left on the text" },
        total_comment_words: { type: "integer", description: "Total word count of all critique text" },
        template_responses: { type: "object", description: "Optional: answers keyed by template question ID" },
      },
      required: ["id"],
    },
    handler: (args) => postAPI(`/api/groups/submissions/${args.id}/critique`, {
      inline_comment_count: args.inline_comment_count || 0,
      total_comment_words: args.total_comment_words || 0,
      template_responses: args.template_responses || {},
    }),
  },
  {
    name: "group_rate_critique",
    description:
      "Rate a critique 1–5 for helpfulness. Only the submission author can rate. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Critique UUID" },
        rating: { type: "integer", minimum: 1, maximum: 5, description: "Helpfulness rating 1–5" },
      },
      required: ["id", "rating"],
    },
    handler: (args) => postAPI(`/api/groups/critiques/${args.id}/rate`, { rating: args.rating }),
  },
  {
    name: "group_reciprocity",
    description:
      "Get the reciprocity table for the current cycle: each member's submission count, critiques given, critiques received, and whether they met the threshold. The caller must be a member. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Group UUID" },
      },
      required: ["id"],
    },
    handler: (args) => fetchAPI(`/api/groups/${args.id}/reciprocity`),
  },
  {
    name: "group_list_templates",
    description:
      "List critique templates for a group. If no templates have been created yet, two presets (Fiction Critique, Poetry Critique) are seeded automatically. The caller must be a member. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Group UUID" },
      },
      required: ["id"],
    },
    handler: (args) => fetchAPI(`/api/groups/${args.id}/templates`),
  },
  {
    name: "group_create_template",
    description:
      "Create a critique template with a name and a list of questions. Each question has an id, label, and prompt. The caller must be an owner or leader. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Group UUID" },
        name: { type: "string", description: "Template name" },
        questions: {
          type: "array",
          description: "Array of question objects, each with id, label, and prompt fields",
          items: { type: "object" },
        },
        is_default: { type: "boolean", description: "Whether this is the default template shown to critics" },
      },
      required: ["id", "name", "questions"],
    },
    handler: (args) => postAPI(`/api/groups/${args.id}/templates`, {
      name: args.name,
      questions: args.questions,
      is_default: args.is_default || false,
    }),
  },
  {
    name: "group_delete_template",
    description:
      "Delete a critique template by UUID. The caller must be an owner or leader of the group the template belongs to. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Template UUID" },
      },
      required: ["id"],
    },
    handler: (args) => deleteAPI(`/api/groups/templates/${args.id}`),
  },

  // ── Sprints ──
  {
    name: "sprint_list",
    description:
      "List all active (non-completed) sprint rooms. Requires authentication.",
    inputSchema: { type: "object", properties: {} },
    handler: () => fetchAPI("/api/sprints"),
  },
  {
    name: "sprint_create",
    description:
      "Create a new sprint room. Optionally link to a group and set a scheduled start time. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Sprint room name" },
        duration_minutes: { type: "integer", description: "Duration in minutes (default 25)" },
        group_id: { type: "string", description: "Group UUID to link this sprint to (optional)" },
        scheduled_start: { type: "string", description: "ISO 8601 start time (optional)" },
      },
    },
    handler: (args) => postAPI("/api/sprints", args),
  },
  {
    name: "sprint_get",
    description:
      "Get a sprint room by UUID, including all participants. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Sprint UUID" },
      },
      required: ["id"],
    },
    handler: (args) => fetchAPI(`/api/sprints/${args.id}`),
  },
  {
    name: "sprint_join",
    description:
      "Join a sprint room with your starting word count. Optionally specify a work to write on. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Sprint UUID" },
        words_start: { type: "integer", description: "Word count when joining" },
        work_id: { type: "string", description: "Work UUID to write on (optional)" },
      },
      required: ["id"],
    },
    handler: (args) => postAPI(`/api/sprints/${args.id}/join`, { words_start: args.words_start || 0, work_id: args.work_id }),
  },
  {
    name: "sprint_start",
    description:
      "Start a sprint room (host only). Sets the room to active and broadcasts the timer start. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Sprint UUID" },
      },
      required: ["id"],
    },
    handler: (args) => postAPI(`/api/sprints/${args.id}/start`, {}),
  },
  {
    name: "sprint_end",
    description:
      "End an active sprint and get ranked results. Words written is calculated as (words_end - words_start) for each participant. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Sprint UUID" },
      },
      required: ["id"],
    },
    handler: (args) => postAPI(`/api/sprints/${args.id}/end`, {}),
  },
  {
    name: "sprint_progress",
    description:
      "Report current word count during an active sprint. Broadcasts the update to all participants in real time. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Sprint UUID" },
        words_end: { type: "integer", description: "Current word count" },
      },
      required: ["id", "words_end"],
    },
    handler: (args) => postAPI(`/api/sprints/${args.id}/progress`, { words_end: args.words_end }),
  },
  {
    name: "group_sprint_schedule",
    description:
      "Schedule a sprint for a writing group. The caller must be a group member. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        group_id: { type: "string", description: "Group UUID" },
        name: { type: "string", description: "Sprint name" },
        duration_minutes: { type: "integer", description: "Duration in minutes (default 25)" },
        scheduled_start: { type: "string", description: "ISO 8601 start time (optional)" },
      },
      required: ["group_id"],
    },
    handler: (args) => {
      const { group_id, ...body } = args;
      return postAPI(`/api/groups/${group_id}/sprints`, body);
    },
  },
  {
    name: "group_sprint_list",
    description:
      "List all sprint rooms for a group, most recent first. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        group_id: { type: "string", description: "Group UUID" },
      },
      required: ["group_id"],
    },
    handler: (args) => fetchAPI(`/api/groups/${args.group_id}/sprints`),
  },

  // ── Writing Stats & Goals ──
  {
    name: "writing_stats",
    description:
      "Get daily writing statistics for the current user over a date range. Returns total words, sprint counts, and a day-by-day breakdown with streak info. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Start date YYYY-MM-DD (default: 30 days ago)" },
        to: { type: "string", description: "End date YYYY-MM-DD (default: today)" },
      },
    },
    handler: (args) => {
      const params = new URLSearchParams();
      if (args.from) params.set("from", args.from);
      if (args.to) params.set("to", args.to);
      return fetchAPI(`/api/writing/stats?${params}`);
    },
  },
  {
    name: "writing_goal_set",
    description:
      "Set a writing goal (daily, weekly, or project). Optionally link to a group. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        goal_type: { type: "string", description: "daily, weekly, or project" },
        target_words: { type: "integer", description: "Target word count" },
        start_date: { type: "string", description: "Start date YYYY-MM-DD (default: today)" },
        end_date: { type: "string", description: "End date YYYY-MM-DD (optional)" },
        group_id: { type: "string", description: "Group UUID (optional)" },
      },
      required: ["target_words"],
    },
    handler: (args) => postAPI("/api/writing/goals", args),
  },
  {
    name: "writing_goals",
    description:
      "List all writing goals for the current user. Requires authentication.",
    inputSchema: { type: "object", properties: {} },
    handler: () => fetchAPI("/api/writing/goals"),
  },
  {
    name: "writing_streak",
    description:
      "Get the current and best writing streak for the current user. Requires authentication.",
    inputSchema: { type: "object", properties: {} },
    handler: () => fetchAPI("/api/writing/streak"),
  },
  {
    name: "group_writing_stats",
    description:
      "Get combined writing stats for all members of a group over a date range. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        group_id: { type: "string", description: "Group UUID" },
        from: { type: "string", description: "Start date YYYY-MM-DD (default: 30 days ago)" },
        to: { type: "string", description: "End date YYYY-MM-DD (default: today)" },
      },
      required: ["group_id"],
    },
    handler: (args) => {
      const params = new URLSearchParams();
      if (args.from) params.set("from", args.from);
      if (args.to) params.set("to", args.to);
      return fetchAPI(`/api/groups/${args.group_id}/writing-stats?${params}`);
    },
  },

  // ── Group Discovery ──
  {
    name: "group_directory_list",
    description:
      "Browse the public group directory. Returns groups that have opted in with their genre, skill level, language, and availability. No authentication required.",
    inputSchema: {
      type: "object",
      properties: {
        type:        { type: "string", description: "Filter by group type: critique, accountability, workshop, co_writing, sprint" },
        genre:       { type: "string", description: "Filter by genre focus (partial match)" },
        skill_level: { type: "string", description: "Filter by skill level: beginner, intermediate, advanced, mixed" },
        language:    { type: "string", description: "Filter by language code (default: en)" },
        has_openings:{ type: "boolean", description: "Only show groups with open spots" },
        limit:       { type: "integer", description: "Max results (default 20, max 50)" },
        offset:      { type: "integer", description: "Pagination offset (default 0)" },
      },
    },
    handler: (args) => {
      const params = new URLSearchParams();
      if (args.type)        params.set("type", args.type);
      if (args.genre)       params.set("genre", args.genre);
      if (args.skill_level) params.set("skill_level", args.skill_level);
      if (args.language)    params.set("language", args.language);
      if (args.has_openings) params.set("has_openings", "true");
      if (args.limit)       params.set("limit", args.limit);
      if (args.offset)      params.set("offset", args.offset);
      return fetchAPI(`/api/groups/directory?${params}`);
    },
  },
  {
    name: "group_directory_settings_get",
    description:
      "Get the directory settings for a group. No authentication required.",
    inputSchema: {
      type: "object",
      properties: {
        group_id: { type: "string", description: "Group UUID" },
      },
      required: ["group_id"],
    },
    handler: (args) => fetchAPI(`/api/groups/${args.group_id}/directory-settings`),
  },
  {
    name: "group_directory_settings_update",
    description:
      "Update the public directory listing for a group. Only the owner or a leader can do this. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        group_id:               { type: "string", description: "Group UUID" },
        genre_focus:            { type: "string", description: "Genre or writing style focus" },
        skill_level:            { type: "string", description: "beginner | intermediate | advanced | mixed" },
        language:               { type: "string", description: "Language code (default: en)" },
        schedule_description:   { type: "string", description: "Human-readable schedule (e.g. 'Weekly on Sundays')" },
        accepting_applications: { type: "boolean", description: "Whether the group accepts applications" },
        sample_required:        { type: "boolean", description: "Whether applicants must provide a writing sample" },
      },
      required: ["group_id"],
    },
    handler: (args) =>
      putAPI(`/api/groups/${args.group_id}/directory-settings`, {
        genre_focus:            args.genre_focus || "",
        skill_level:            args.skill_level || "mixed",
        language:               args.language || "en",
        schedule_description:   args.schedule_description || "",
        accepting_applications: args.accepting_applications !== false,
        sample_required:        args.sample_required || false,
      }),
  },
  {
    name: "group_apply",
    description:
      "Submit a membership application to a listed group. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        group_id:     { type: "string", description: "Group UUID" },
        introduction: { type: "string", description: "Why you want to join" },
        sample_text:  { type: "string", description: "Writing sample (required if the group requests one)" },
      },
      required: ["group_id", "introduction"],
    },
    handler: (args) =>
      postAPI(`/api/groups/${args.group_id}/apply`, {
        introduction: args.introduction,
        sample_text:  args.sample_text || "",
      }),
  },
  {
    name: "group_list_applications",
    description:
      "List applications for a group. Caller must be a leader or owner. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        group_id: { type: "string", description: "Group UUID" },
        status:   { type: "string", description: "Filter by status: pending | approved | declined (omit for all)" },
      },
      required: ["group_id"],
    },
    handler: (args) => {
      const params = new URLSearchParams();
      if (args.status) params.set("status", args.status);
      return fetchAPI(`/api/groups/${args.group_id}/applications?${params}`);
    },
  },
  {
    name: "group_approve_application",
    description:
      "Approve a membership application. Adds the applicant as a member. Caller must be a leader or owner. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        application_id: { type: "string", description: "Application UUID" },
      },
      required: ["application_id"],
    },
    handler: (args) => postAPI(`/api/groups/applications/${args.application_id}/approve`, {}),
  },
  {
    name: "group_decline_application",
    description:
      "Decline a membership application with an optional reason. Caller must be a leader or owner. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        application_id: { type: "string", description: "Application UUID" },
        reason:         { type: "string", description: "Optional reason shown to no one (internal notes)" },
      },
      required: ["application_id"],
    },
    handler: (args) =>
      postAPI(`/api/groups/applications/${args.application_id}/decline`, {
        reason: args.reason || "",
      }),
  },
  {
    name: "group_find_matches",
    description:
      "Find listed groups that match your preferences, ranked by compatibility score. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        preferred_type:       { type: "string", description: "Group type: critique, accountability, workshop, co_writing, sprint" },
        preferred_genre:      { type: "string", description: "Genre preference" },
        experience_level:     { type: "string", description: "beginner | intermediate | advanced | mixed" },
        commitment_frequency: { type: "string", description: "How often you can commit (e.g. weekly)" },
        timezone:             { type: "string", description: "Your timezone (e.g. Europe/London)" },
      },
    },
    handler: (args) =>
      postAPI("/api/groups/match", {
        preferred_type:       args.preferred_type || "critique",
        preferred_genre:      args.preferred_genre || "",
        experience_level:     args.experience_level || "mixed",
        commitment_frequency: args.commitment_frequency || "",
        timezone:             args.timezone || "",
      }),
  },
  {
    name: "group_match_pool_join",
    description:
      "Join the user matching pool so you can be paired with other unmatched writers to form a new group. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        preferred_type:       { type: "string", description: "Group type preference" },
        preferred_genre:      { type: "string", description: "Genre preference" },
        experience_level:     { type: "string", description: "beginner | intermediate | advanced | mixed" },
        commitment_frequency: { type: "string", description: "How often you can commit" },
        timezone:             { type: "string", description: "Your timezone" },
      },
    },
    handler: (args) =>
      postAPI("/api/groups/match-pool", {
        preferred_type:       args.preferred_type || "critique",
        preferred_genre:      args.preferred_genre || "",
        experience_level:     args.experience_level || "mixed",
        commitment_frequency: args.commitment_frequency || "",
        timezone:             args.timezone || "",
      }),
  },
  {
    name: "group_match_pool_leave",
    description:
      "Leave the user matching pool. Requires authentication.",
    inputSchema: { type: "object", properties: {} },
    handler: () => deleteAPI("/api/groups/match-pool"),
  },

  // ── Group Challenges ──
  {
    name: "group_challenge_create",
    description:
      "Create a new challenge in a group. Caller must be owner, leader, or moderator. Requires authentication.",
    inputSchema: {
      type: "object",
      required: ["group_id", "prompt", "deadline"],
      properties: {
        group_id: { type: "string", description: "Group UUID" },
        prompt: { type: "string", description: "The writing prompt" },
        deadline: { type: "string", description: "ISO 8601 deadline timestamp" },
        word_limit: { type: "integer", description: "Optional word limit for entries" },
        voting_enabled: { type: "boolean", description: "Whether to open a voting round after the challenge closes (default false)" },
      },
    },
    handler: (args) =>
      postAPI(`/api/groups/${args.group_id}/challenges`, {
        prompt: args.prompt,
        deadline: args.deadline,
        word_limit: args.word_limit || null,
        voting_enabled: args.voting_enabled || false,
      }),
  },
  {
    name: "group_challenge_list",
    description:
      "List challenges for a group, optionally filtered by status (open/closed/archived). No authentication required.",
    inputSchema: {
      type: "object",
      required: ["group_id"],
      properties: {
        group_id: { type: "string", description: "Group UUID" },
        status: { type: "string", description: "Filter by status: open, closed, archived" },
      },
    },
    handler: (args) => {
      const qs = args.status ? `?status=${encodeURIComponent(args.status)}` : "";
      return fetchAPI(`/api/groups/${args.group_id}/challenges${qs}`);
    },
  },
  {
    name: "group_challenge_get",
    description:
      "Get a single group challenge by ID. No authentication required.",
    inputSchema: {
      type: "object",
      required: ["challenge_id"],
      properties: {
        challenge_id: { type: "string", description: "Challenge UUID" },
      },
    },
    handler: (args) => fetchAPI(`/api/groups/challenges/${args.challenge_id}`),
  },
  {
    name: "group_challenge_entry_submit",
    description:
      "Submit or update an entry for an open group challenge. Requires authentication and group membership.",
    inputSchema: {
      type: "object",
      required: ["challenge_id", "body_json"],
      properties: {
        challenge_id: { type: "string", description: "Challenge UUID" },
        body_json: { type: "object", description: "ProseMirror JSON document" },
      },
    },
    handler: (args) =>
      postAPI(`/api/groups/challenges/${args.challenge_id}/entries`, {
        body_json: args.body_json,
      }),
  },
  {
    name: "group_challenge_entries_list",
    description:
      "List entries for a group challenge. While open, only returns the caller's own entry. After closing, returns all entries. Requires authentication.",
    inputSchema: {
      type: "object",
      required: ["challenge_id"],
      properties: {
        challenge_id: { type: "string", description: "Challenge UUID" },
      },
    },
    handler: (args) => fetchAPI(`/api/groups/challenges/${args.challenge_id}/entries`),
  },
  {
    name: "group_challenge_vote",
    description:
      "Vote for an entry in a closed group challenge with voting enabled. Cannot vote for your own entry. Requires authentication.",
    inputSchema: {
      type: "object",
      required: ["challenge_id", "entry_id"],
      properties: {
        challenge_id: { type: "string", description: "Challenge UUID" },
        entry_id: { type: "string", description: "Entry UUID to vote for" },
      },
    },
    handler: (args) =>
      postAPI(`/api/groups/challenges/${args.challenge_id}/vote`, {
        entry_id: args.entry_id,
      }),
  },
  {
    name: "group_challenge_results",
    description:
      "Get results for a closed or archived group challenge, ranked by vote count. No authentication required.",
    inputSchema: {
      type: "object",
      required: ["challenge_id"],
      properties: {
        challenge_id: { type: "string", description: "Challenge UUID" },
      },
    },
    handler: (args) => fetchAPI(`/api/groups/challenges/${args.challenge_id}/results`),
  },

  // ── Group Project Tracking ──
  {
    name: "group_project_register",
    description:
      "Register a new project for a group member. The caller must be a group member and must not already have an active (non-complete) project in this group. Requires authentication.",
    inputSchema: {
      type: "object",
      required: ["group_id", "title"],
      properties: {
        group_id: { type: "string", description: "Group UUID" },
        title: { type: "string", description: "Project title" },
        description: { type: "string", description: "Short description of the project" },
        genre: { type: "string", description: "Genre (e.g. Fantasy, Literary Fiction)" },
        work_id: { type: "string", description: "Optional UUID of an existing work to link" },
        target_words: { type: "integer", description: "Optional target word count" },
      },
    },
    handler: (args) =>
      postAPI(`/api/groups/${args.group_id}/projects`, {
        title: args.title,
        description: args.description,
        genre: args.genre,
        work_id: args.work_id,
        target_words: args.target_words,
      }),
  },
  {
    name: "group_project_list",
    description:
      "List all projects for a group. Active projects appear before completed ones. No authentication required.",
    inputSchema: {
      type: "object",
      required: ["group_id"],
      properties: {
        group_id: { type: "string", description: "Group UUID" },
      },
    },
    handler: (args) => fetchAPI(`/api/groups/${args.group_id}/projects`),
  },
  {
    name: "group_project_get",
    description:
      "Get a single project by ID, including its milestones. No authentication required.",
    inputSchema: {
      type: "object",
      required: ["project_id"],
      properties: {
        project_id: { type: "string", description: "Project UUID" },
      },
    },
    handler: (args) => fetchAPI(`/api/groups/projects/${args.project_id}`),
  },
  {
    name: "group_project_update",
    description:
      "Update a project's title, description, genre, target word count, or current word count. Only the project owner may update. Requires authentication.",
    inputSchema: {
      type: "object",
      required: ["project_id", "title"],
      properties: {
        project_id: { type: "string", description: "Project UUID" },
        title: { type: "string", description: "Project title" },
        description: { type: "string", description: "Short description" },
        genre: { type: "string", description: "Genre" },
        work_id: { type: "string", description: "UUID of linked work (or null to unlink)" },
        target_words: { type: "integer", description: "Target word count" },
        current_words: { type: "integer", description: "Current word count" },
      },
    },
    handler: (args) =>
      putAPI(`/api/groups/projects/${args.project_id}`, {
        title: args.title,
        description: args.description,
        genre: args.genre,
        work_id: args.work_id,
        target_words: args.target_words,
        current_words: args.current_words,
      }),
  },
  {
    name: "group_project_update_stage",
    description:
      "Advance a project to a new stage (drafting | revising | polishing | complete). Only the project owner may change the stage. Requires authentication.",
    inputSchema: {
      type: "object",
      required: ["project_id", "stage"],
      properties: {
        project_id: { type: "string", description: "Project UUID" },
        stage: {
          type: "string",
          enum: ["drafting", "revising", "polishing", "complete"],
          description: "New stage",
        },
      },
    },
    handler: (args) =>
      putAPI(`/api/groups/projects/${args.project_id}/stage`, { stage: args.stage }),
  },
  {
    name: "group_project_milestone_create",
    description:
      "Log a milestone reached on a project. Only the project owner may create milestones. Requires authentication.",
    inputSchema: {
      type: "object",
      required: ["project_id", "title"],
      properties: {
        project_id: { type: "string", description: "Project UUID" },
        title: { type: "string", description: "Milestone title (e.g. 'First chapter done')" },
        milestone_type: {
          type: "string",
          enum: ["first_draft", "revision", "chapter_target", "word_target", "custom"],
          description: "Type of milestone (default: custom)",
        },
      },
    },
    handler: (args) =>
      postAPI(`/api/groups/projects/${args.project_id}/milestones`, {
        title: args.title,
        milestone_type: args.milestone_type || "custom",
      }),
  },
  {
    name: "group_project_milestones_list",
    description:
      "List all milestones for a project in chronological order. No authentication required.",
    inputSchema: {
      type: "object",
      required: ["project_id"],
      properties: {
        project_id: { type: "string", description: "Project UUID" },
      },
    },
    handler: (args) => fetchAPI(`/api/groups/projects/${args.project_id}/milestones`),
  },

  // ── Group-Scoped Competitions ──
  {
    name: "group_competition_create",
    description:
      "Create a full writing competition scoped to a group. Only group members may sign up. Requires authentication and group membership.",
    inputSchema: {
      type: "object",
      required: ["group_id", "title", "prompt", "form_constraint", "word_limit", "min_participants"],
      properties: {
        group_id: { type: "string", description: "Group UUID" },
        title: { type: "string", description: "Competition title (max 200 chars)" },
        prompt: { type: "string", description: "Writing prompt" },
        form_constraint: { type: "string", description: "poem | short_story | essay | screenplay | any" },
        word_limit: { type: "integer", description: "Word limit (500–20000)" },
        min_participants: { type: "integer", description: "Minimum participants to start (>= 5)" },
        runners_up_count: { type: "integer", description: "Number of runners-up to highlight (default 2)" },
        signup_duration_days: { type: "integer", description: "Days for signup phase (default 7)" },
        writing_duration_days: { type: "integer", description: "Days for writing phase (default 14)" },
        voting_duration_days: { type: "integer", description: "Days for voting phase (default 7)" },
      },
    },
    handler: (args) =>
      postAPI(`/api/groups/${args.group_id}/competitions`, {
        title: args.title,
        prompt: args.prompt,
        form_constraint: args.form_constraint,
        word_limit: args.word_limit,
        min_participants: args.min_participants,
        runners_up_count: args.runners_up_count,
        signup_duration_days: args.signup_duration_days,
        writing_duration_days: args.writing_duration_days,
        voting_duration_days: args.voting_duration_days,
      }),
  },
  {
    name: "group_competition_list",
    description:
      "List competitions scoped to a group, optionally filtered by phase. No authentication required.",
    inputSchema: {
      type: "object",
      required: ["group_id"],
      properties: {
        group_id: { type: "string", description: "Group UUID" },
        phase: { type: "string", description: "Filter by phase: signup, writing, voting, completed, cancelled" },
        limit: { type: "integer", description: "Max results (default 50)" },
      },
    },
    handler: (args) => {
      const params = new URLSearchParams();
      if (args.phase) params.set("phase", args.phase);
      if (args.limit) params.set("limit", String(args.limit));
      const qs = params.toString() ? `?${params.toString()}` : "";
      return fetchAPI(`/api/groups/${args.group_id}/competitions${qs}`);
    },
  },

  // ── Notifications ──
  {
    name: "list_notifications",
    description:
      "List your notifications. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Max notifications (default 20)" },
      },
    },
    handler: (args) => {
      const limit = args.limit || 20;
      return fetchAPI(`/api/notifications?limit=${limit}`);
    },
  },
  {
    name: "mark_notifications_read",
    description:
      "Mark all notifications as read. Requires authentication.",
    inputSchema: { type: "object", properties: {} },
    handler: () => putAPI("/api/notifications/read-all"),
  },

  // ── Bookmarks ──
  {
    name: "list_bookmarks",
    description:
      "List your bookmarks. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Max bookmarks (default 20)" },
      },
    },
    handler: (args) => {
      const limit = args.limit || 20;
      return fetchAPI(`/api/bookmarks?limit=${limit}`);
    },
  },
  {
    name: "toggle_bookmark",
    description:
      "Toggle a bookmark on content (monument, work, thread). Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        content_type: {
          type: "string",
          description: "Type: monument, work, thread",
        },
        content_id: {
          type: "string",
          description: "UUID of the content to bookmark",
        },
      },
      required: ["content_type", "content_id"],
    },
    handler: (args) =>
      postAPI("/api/bookmarks/toggle", {
        content_type: args.content_type,
        content_id: args.content_id,
      }),
  },

  // ── Encounters ──
  {
    name: "get_encounter",
    description:
      "Get today's encounter — CivNode pairs two users each day for a brief anonymous exchange. Requires authentication.",
    inputSchema: { type: "object", properties: {} },
    handler: () => fetchAPI("/api/encounters/today"),
  },

  // ── Presence ──
  {
    name: "get_presence",
    description:
      "See how many people are currently on CivNode. Returns ambient presence count, not identities.",
    inputSchema: { type: "object", properties: {} },
    handler: () => fetchAPI("/api/presence"),
  },

  // ── Supporter / Stripe ──
  {
    name: "get_supporter_status",
    description:
      "Check your current supporter status and account details. Requires authentication.",
    inputSchema: { type: "object", properties: {} },
    handler: () => fetchAPI("/api/auth/me"),
  },
  {
    name: "supporter_checkout",
    description:
      "Create a Stripe checkout session to become a CivNode supporter ($5/month). Returns a URL to complete the payment in a browser. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        success_url: {
          type: "string",
          description:
            "URL to redirect to after successful payment (default: civnode.com)",
        },
        cancel_url: {
          type: "string",
          description:
            "URL to redirect to if payment is cancelled (default: civnode.com)",
        },
      },
    },
    handler: (args) =>
      postAPI("/api/stripe/checkout", {
        success_url:
          args.success_url || `${API_BASE}/#settings?checkout=success`,
        cancel_url:
          args.cancel_url || `${API_BASE}/#settings?checkout=cancel`,
      }),
  },
  {
    name: "supporter_cancel",
    description:
      "Cancel your supporter subscription. Cancels at the end of the current billing period. Requires authentication.",
    inputSchema: { type: "object", properties: {} },
    handler: () => postAPI("/api/stripe/cancel"),
  },

  // ─── Purchases & Earnings ───
  {
    name: "purchase_checkout",
    description:
      "Create a Stripe checkout session to purchase a book or work. Returns a checkout URL. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        item_type: { type: "string", enum: ["book", "work"], description: "Type of item to purchase" },
        item_id: { type: "string", description: "UUID of the book or work" },
        amount_cents: { type: "integer", description: "Amount to pay in cents (must be >= minimum price)" },
        success_url: { type: "string", description: "URL to redirect to after successful payment" },
        cancel_url: { type: "string", description: "URL to redirect to if payment is cancelled" },
      },
      required: ["item_type", "item_id", "amount_cents", "success_url", "cancel_url"],
    },
    handler: (args) =>
      postAPI("/api/purchase/checkout", {
        item_type: args.item_type,
        item_id: args.item_id,
        amount_cents: args.amount_cents,
        success_url: args.success_url,
        cancel_url: args.cancel_url,
      }),
  },
  {
    name: "check_purchase",
    description:
      "Check if the current user has purchased a specific book or work. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        item_type: { type: "string", enum: ["book", "work"], description: "Type of item" },
        item_id: { type: "string", description: "UUID of the book or work" },
      },
      required: ["item_type", "item_id"],
    },
    handler: (args) =>
      getAPI(`/api/purchases/check?item_type=${args.item_type}&item_id=${args.item_id}`),
  },
  {
    name: "list_my_purchases",
    description:
      "List all purchases made by the current user. Returns purchase history with item titles, authors, and amounts. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Max results (default 50, max 100)" },
        offset: { type: "integer", description: "Offset for pagination" },
      },
    },
    handler: (args) => {
      const params = new URLSearchParams();
      if (args.limit) params.set("limit", args.limit);
      if (args.offset) params.set("offset", args.offset);
      return getAPI(`/api/purchases?${params}`);
    },
  },
  {
    name: "get_author_balance",
    description:
      "Get the current user's author earnings balance and lifetime totals. Requires authentication.",
    inputSchema: { type: "object", properties: {} },
    handler: () => getAPI("/api/author/balance"),
  },
  {
    name: "list_author_sales",
    description:
      "List all sales for the current user as an author. Shows buyer info, amounts, fees, and author share. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Max results (default 50, max 100)" },
        offset: { type: "integer", description: "Offset for pagination" },
      },
    },
    handler: (args) => {
      const params = new URLSearchParams();
      if (args.limit) params.set("limit", args.limit);
      if (args.offset) params.set("offset", args.offset);
      return getAPI(`/api/author/sales?${params}`);
    },
  },

  // ─── Downloads & Library ───
  {
    name: "purchase_download",
    description:
      "Download the encrypted .ecivbook file for a purchased book. Returns binary data (application/octet-stream). The file is encrypted and requires a decryption token from purchase_token. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        purchase_id: { type: "string", description: "UUID of the purchase" },
      },
      required: ["purchase_id"],
    },
    handler: (args) =>
      fetchAPI(`/api/purchases/${args.purchase_id}/download`),
  },
  {
    name: "purchase_token",
    description:
      "Get the decryption token (wrapped key) for a purchased book. The token is needed to decrypt the .ecivbook file downloaded via purchase_download. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        purchase_id: { type: "string", description: "UUID of the purchase" },
      },
      required: ["purchase_id"],
    },
    handler: (args) =>
      fetchAPI(`/api/purchases/${args.purchase_id}/token`),
  },
  {
    name: "purchase_token_status",
    description:
      "Check whether a purchase's decryption token is still valid or needs updating. Returns validity, version info, and whether a newer key version is available. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        purchase_id: { type: "string", description: "UUID of the purchase" },
      },
      required: ["purchase_id"],
    },
    handler: (args) =>
      fetchAPI(`/api/purchases/${args.purchase_id}/status`),
  },
  {
    name: "user_library",
    description:
      "List all books the current user has purchased, with download and encryption metadata. Returns book titles, authors, cover URLs, purchase dates, and encryption key versions. Requires authentication.",
    inputSchema: { type: "object", properties: {} },
    handler: () => fetchAPI("/api/user/library"),
  },
  {
    name: "purchase_claim_free",
    description:
      "Claim a free book (one where the author set no minimum price). Creates a purchase record with zero amount, granting full access and download rights. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        item_type: { type: "string", enum: ["book"], description: "Type of item (currently only 'book')" },
        item_id: { type: "string", description: "UUID of the book to claim" },
      },
      required: ["item_type", "item_id"],
    },
    handler: (args) =>
      postAPI("/api/purchase/claim", {
        item_type: args.item_type,
        item_id: args.item_id,
      }),
  },

  // ─── Social Accounts ───
  {
    name: "list_social_accounts",
    description:
      "List connected social media accounts (Bluesky, Mastodon) for sharing your Monument. Requires authentication.",
    inputSchema: { type: "object", properties: {} },
    handler: () => fetchAPI("/api/settings/social"),
  },
  {
    name: "connect_bluesky",
    description:
      "Connect a Bluesky account for Monument sharing. Requires a Bluesky handle and app password (not your main password — create one at bsky.app/settings/app-passwords). Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        handle: {
          type: "string",
          description: "Bluesky handle (e.g. user.bsky.social)",
        },
        app_password: {
          type: "string",
          description: "Bluesky app password",
        },
      },
      required: ["handle", "app_password"],
    },
    handler: (args) =>
      postAPI("/api/settings/social/bluesky", {
        handle: args.handle,
        app_password: args.app_password,
      }),
  },
  {
    name: "disconnect_bluesky",
    description:
      "Disconnect your Bluesky account from CivNode. Requires authentication.",
    inputSchema: { type: "object", properties: {} },
    handler: () => deleteAPI("/api/settings/social/bluesky"),
  },
  {
    name: "disconnect_mastodon",
    description:
      "Disconnect your Mastodon account from CivNode. Requires authentication.",
    inputSchema: { type: "object", properties: {} },
    handler: () => deleteAPI("/api/settings/social/mastodon"),
  },

  // ─── Writing Comments ───
  {
    name: "list_comments",
    description: "List all comments on a creative writing piece.",
    inputSchema: {
      type: "object",
      properties: {
        work_id: { type: "string", description: "UUID of the writing work" },
      },
      required: ["work_id"],
    },
    handler: (args) => fetchAPI(`/api/writing/${args.work_id}/comments`),
  },
  {
    name: "create_comment",
    description:
      "Add a comment to a writing piece. Optionally reference a text selection. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        work_id: { type: "string", description: "UUID of the writing work" },
        body: { type: "string", description: "Comment text (max 2000 chars)" },
        parent_id: {
          type: "string",
          description: "UUID of parent comment for replies (optional)",
        },
        sel_start: {
          type: "number",
          description: "Start position of selected text (optional)",
        },
        sel_end: {
          type: "number",
          description: "End position of selected text (optional)",
        },
        sel_text: {
          type: "string",
          description: "The selected text being commented on (optional)",
        },
      },
      required: ["work_id", "body"],
    },
    handler: (args) =>
      postAPI(`/api/writing/${args.work_id}/comments`, {
        body: args.body,
        parent_id: args.parent_id || null,
        sel_start: args.sel_start ?? null,
        sel_end: args.sel_end ?? null,
        sel_text: args.sel_text || null,
      }),
  },
  {
    name: "delete_comment",
    description:
      "Delete a comment (own comments or work author can delete any). Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        comment_id: { type: "string", description: "UUID of the comment" },
      },
      required: ["comment_id"],
    },
    handler: (args) => deleteAPI(`/api/writing/comments/${args.comment_id}`),
  },

  // ─── Draft Sharing ───
  {
    name: "create_share_link",
    description:
      "Generate a shareable link for a writing piece. Author only. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        work_id: { type: "string", description: "UUID of the writing work" },
      },
      required: ["work_id"],
    },
    handler: (args) => postAPI(`/api/writing/${args.work_id}/share`),
  },
  {
    name: "list_share_links",
    description:
      "List all share links for a writing piece. Author only. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        work_id: { type: "string", description: "UUID of the writing work" },
      },
      required: ["work_id"],
    },
    handler: (args) => fetchAPI(`/api/writing/${args.work_id}/shares`),
  },
  {
    name: "get_shared_work",
    description: "Read a shared writing piece by its share token.",
    inputSchema: {
      type: "object",
      properties: {
        token: { type: "string", description: "Share token" },
      },
      required: ["token"],
    },
    handler: (args) => fetchAPI(`/api/writing/shared/${args.token}`),
  },
  {
    name: "delete_share_link",
    description:
      "Delete a share link. Author only. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        share_id: { type: "string", description: "UUID of the share link" },
      },
      required: ["share_id"],
    },
    handler: (args) => deleteAPI(`/api/writing/shares/${args.share_id}`),
  },

  // ─── Collaborators ───
  {
    name: "list_collaborators",
    description: "List all collaborators on a writing piece.",
    inputSchema: {
      type: "object",
      properties: {
        work_id: { type: "string", description: "UUID of the writing work" },
      },
      required: ["work_id"],
    },
    handler: (args) =>
      fetchAPI(`/api/writing/${args.work_id}/collaborators`),
  },
  {
    name: "invite_collaborator",
    description:
      "Invite a user as collaborator on your writing piece. Author only. Max 5. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        work_id: { type: "string", description: "UUID of the writing work" },
        alias: {
          type: "string",
          description: "Username (alias) of the user to invite",
        },
        role: {
          type: "string",
          enum: ["coauthor", "editor"],
          description: "Role: coauthor (can edit) or editor (can suggest)",
        },
      },
      required: ["work_id", "alias"],
    },
    handler: (args) =>
      postAPI(`/api/writing/${args.work_id}/collaborators`, {
        alias: args.alias,
        role: args.role || "coauthor",
      }),
  },
  {
    name: "accept_collaboration",
    description:
      "Accept a collaboration invitation on a writing piece. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        work_id: { type: "string", description: "UUID of the writing work" },
      },
      required: ["work_id"],
    },
    handler: (args) =>
      postAPI(`/api/writing/${args.work_id}/collaborators/accept`),
  },
  {
    name: "remove_collaborator",
    description:
      "Remove a collaborator from a writing piece. Author or self can remove. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        collaborator_id: {
          type: "string",
          description: "UUID of the collaborator record",
        },
      },
      required: ["collaborator_id"],
    },
    handler: (args) =>
      deleteAPI(`/api/writing/collaborators/${args.collaborator_id}`),
  },

  // ─── AI Writing Tools ───
  // ai_writing_feedback and ai_title_summary_suggest removed.
  // AI writing features are now available only in book chapters.

  // ── Extended Writing ──
  {
    name: "list_my_works",
    description:
      "List your own writing works (drafts and published). Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Max results (default 20)" },
      },
    },
    handler: (args) => {
      const limit = args.limit || 20;
      return fetchAPI(`/api/works/mine?limit=${limit}`);
    },
  },
  {
    name: "update_work",
    description:
      "Update a writing work's content, title, mood tags, or identity mode. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Work UUID" },
        title: { type: "string", description: "New title" },
        body_markdown: { type: "string", description: "New content in Markdown" },
        mood_tags: {
          type: "array",
          items: { type: "string" },
          description: "1-3 mood tags",
        },
        identity_mode: {
          type: "string",
          description: "Identity: alias, real_name, or incognito",
        },
      },
      required: ["id"],
    },
    handler: (args) => {
      const body = {};
      if (args.title) body.title = args.title;
      if (args.body_markdown) body.body_markdown = args.body_markdown;
      if (args.mood_tags) body.mood_tags = args.mood_tags;
      if (args.identity_mode) body.identity_mode = args.identity_mode;
      return putAPI(`/api/works/${args.id}`, body);
    },
  },
  {
    name: "delete_work",
    description:
      "Delete a writing work permanently. Author only. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Work UUID" },
      },
      required: ["id"],
    },
    handler: (args) => deleteAPI(`/api/works/${args.id}`),
  },
  {
    name: "export_work",
    description: "Export a work as Markdown or other format. Author only. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Work UUID" },
      },
      required: ["id"],
    },
    handler: (args) => fetchAPI(`/api/works/${args.id}/export`),
  },
  {
    name: "create_series",
    description:
      "Create a new writing series to group related works. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Series title" },
        description: { type: "string", description: "Series description" },
      },
      required: ["title"],
    },
    handler: (args) =>
      postAPI("/api/works/series", {
        title: args.title,
        description: args.description || "",
      }),
  },
  {
    name: "list_my_series",
    description: "List your writing series. Requires authentication.",
    inputSchema: { type: "object", properties: {} },
    handler: () => fetchAPI("/api/works/series/mine"),
  },
  {
    name: "add_work_to_series",
    description: "Add a work to a series. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        series_id: { type: "string", description: "Series UUID" },
        work_id: { type: "string", description: "Work UUID to add" },
      },
      required: ["series_id", "work_id"],
    },
    handler: (args) =>
      postAPI(`/api/works/series/${args.series_id}/works/${args.work_id}`),
  },

  // ── Characters ──
  {
    name: "list_characters",
    description:
      "List your characters in the compendium. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Max results (default 50)" },
      },
    },
    handler: (args) => {
      const limit = args.limit || 50;
      return fetchAPI(`/api/characters?limit=${limit}`);
    },
  },
  {
    name: "get_character",
    description: "Get a character's full profile by ID. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Character UUID" },
      },
      required: ["id"],
    },
    handler: (args) => fetchAPI(`/api/characters/${args.id}`),
  },
  {
    name: "create_character",
    description:
      "Create a new character in the compendium. Only name is required — fill in other fields later or use AI. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Character name (required)" },
        nickname: { type: "string", description: "Nickname or alias" },
        occupation: { type: "string", description: "Occupation or role" },
        age: { type: "string", description: "Age (free text, e.g. '34', 'elderly')" },
        gender: { type: "string", description: "Gender" },
        status: { type: "string", description: "Status (e.g. alive, deceased)" },
        social_class: { type: "string", description: "Social class or station" },
        appearance: { type: "string", description: "Physical appearance" },
        personality: { type: "string", description: "Personality traits" },
        motivations: { type: "string", description: "Goals and motivations" },
        backstory: { type: "string", description: "Background story" },
        skills: { type: "string", description: "Skills and abilities" },
        notes: { type: "string", description: "Additional notes" },
        worldview: { type: "string", description: "Worldview and beliefs" },
        voice: { type: "string", description: "Speech patterns and voice" },
        era: { type: "string", description: "Time period" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags for categorization",
        },
      },
      required: ["name"],
    },
    handler: (args) => postAPI("/api/characters", args),
  },
  {
    name: "update_character",
    description:
      "Update a character's fields. Pass only the fields you want to change. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Character UUID" },
        name: { type: "string", description: "Character name" },
        nickname: { type: "string", description: "Nickname" },
        occupation: { type: "string", description: "Occupation" },
        age: { type: "string", description: "Age" },
        gender: { type: "string", description: "Gender" },
        status: { type: "string", description: "Status" },
        social_class: { type: "string", description: "Social class" },
        appearance: { type: "string", description: "Appearance" },
        personality: { type: "string", description: "Personality" },
        motivations: { type: "string", description: "Motivations" },
        backstory: { type: "string", description: "Backstory" },
        skills: { type: "string", description: "Skills" },
        notes: { type: "string", description: "Notes" },
        worldview: { type: "string", description: "Worldview" },
        voice: { type: "string", description: "Voice" },
        era: { type: "string", description: "Era" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags",
        },
      },
      required: ["id"],
    },
    handler: (args) => {
      const { id, ...fields } = args;
      return putAPI(`/api/characters/${id}`, fields);
    },
  },
  {
    name: "delete_character",
    description: "Delete a character permanently. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Character UUID" },
      },
      required: ["id"],
    },
    handler: (args) => deleteAPI(`/api/characters/${args.id}`),
  },
  {
    name: "ai_generate_character",
    description:
      "Generate a complete character using AI. Provide optional hints for role, genre, and setting. Requires authentication and an AI provider configured.",
    inputSchema: {
      type: "object",
      properties: {
        role: { type: "string", description: "Character role (e.g. 'reluctant hero', 'merchant')" },
        genre: { type: "string", description: "Genre (e.g. 'fantasy', 'noir', 'sci-fi')" },
        setting: { type: "string", description: "Setting context" },
      },
    },
    handler: (args) =>
      postAPI("/api/characters/ai-generate", {
        role: args.role || "",
        genre: args.genre || "",
        setting: args.setting || "",
      }),
  },
  {
    name: "character_portrait_generate",
    description:
      "Generate an AI portrait for a character. Requires authentication and an image provider configured.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Character UUID" },
      },
      required: ["id"],
    },
    handler: (args) => postAPI(`/api/characters/${args.id}/portrait/generate`),
  },
  {
    name: "character_suggestions",
    description:
      "Get AI suggestions for a specific character field. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Character UUID" },
        field: {
          type: "string",
          enum: ["appearance", "personality", "backstory", "motivations", "skills", "notes"],
          description: "Which field to get suggestions for",
        },
      },
      required: ["id", "field"],
    },
    handler: (args) =>
      postAPI(`/api/characters/${args.id}/suggestions`, { field: args.field }),
  },
  {
    name: "character_publish",
    description:
      "Publish a character to the marketplace for others to discover and fork. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Character UUID" },
      },
      required: ["id"],
    },
    handler: (args) => postAPI(`/api/characters/${args.id}/publish`),
  },
  {
    name: "character_unpublish",
    description: "Remove a character from the marketplace. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Character UUID" },
      },
      required: ["id"],
    },
    handler: (args) => postAPI(`/api/characters/${args.id}/unpublish`),
  },
  {
    name: "character_relationships",
    description: "Get all relationships for a character. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Character UUID" },
      },
      required: ["id"],
    },
    handler: (args) => fetchAPI(`/api/characters/${args.id}/relationships`),
  },
  {
    name: "entity_explorer_chat_character",
    description:
      "Interview a character via the Entity Explorer. Chat with the character in character — the AI responds as them, grounded in your chapter content, entity details, and relationships. Requires authentication and BYOK AI provider.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Character UUID" },
        question: { type: "string", description: "The question to ask the character" },
        history: {
          type: "array",
          items: {
            type: "object",
            properties: {
              role: { type: "string", enum: ["user", "assistant"] },
              content: { type: "string" },
            },
          },
          description: "Previous conversation turns",
        },
        book_id: { type: "string", description: "Book UUID for semantic search context" },
      },
      required: ["id", "question"],
    },
    handler: (args) => {
      const body = { question: args.question };
      if (args.history) body.history = args.history;
      if (args.book_id) body.book_id = args.book_id;
      return postAPI(`/api/characters/${args.id}/explorer/chat`, body);
    },
  },

  // ── Locations ──
  {
    name: "list_locations",
    description: "List your locations in the compendium. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Max results (default 50)" },
      },
    },
    handler: (args) => {
      const limit = args.limit || 50;
      return fetchAPI(`/api/locations?limit=${limit}`);
    },
  },
  {
    name: "get_location",
    description: "Get a location's full details by ID. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Location UUID" },
      },
      required: ["id"],
    },
    handler: (args) => fetchAPI(`/api/locations/${args.id}`),
  },
  {
    name: "create_location",
    description:
      "Create a new location in the compendium. Only name is required. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Location name (required)" },
        description: { type: "string", description: "General description" },
        atmosphere: { type: "string", description: "Mood and atmosphere" },
        sensory_details: { type: "string", description: "Sights, sounds, smells" },
        notable_features: { type: "string", description: "Key landmarks or features" },
        inhabitants: { type: "string", description: "Who lives or works here" },
        secrets: { type: "string", description: "Hidden aspects" },
        era: { type: "string", description: "Time period" },
        location_type: { type: "string", description: "Type (e.g. city, forest, castle)" },
        notes: { type: "string", description: "Additional notes" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags for categorization",
        },
      },
      required: ["name"],
    },
    handler: (args) => postAPI("/api/locations", args),
  },
  {
    name: "update_location",
    description:
      "Update a location's fields. Pass only the fields to change. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Location UUID" },
        name: { type: "string", description: "Location name" },
        description: { type: "string", description: "Description" },
        atmosphere: { type: "string", description: "Atmosphere" },
        sensory_details: { type: "string", description: "Sensory details" },
        notable_features: { type: "string", description: "Notable features" },
        inhabitants: { type: "string", description: "Inhabitants" },
        secrets: { type: "string", description: "Secrets" },
        era: { type: "string", description: "Era" },
        location_type: { type: "string", description: "Location type" },
        notes: { type: "string", description: "Notes" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags",
        },
      },
      required: ["id"],
    },
    handler: (args) => {
      const { id, ...fields } = args;
      return putAPI(`/api/locations/${id}`, fields);
    },
  },
  {
    name: "delete_location",
    description: "Delete a location permanently. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Location UUID" },
      },
      required: ["id"],
    },
    handler: (args) => deleteAPI(`/api/locations/${args.id}`),
  },
  {
    name: "location_ai_fill",
    description:
      "Use AI to fill in missing details for a location based on its name and existing fields. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Location UUID" },
      },
      required: ["id"],
    },
    handler: (args) => postAPI(`/api/locations/${args.id}/ai-fill`),
  },
  {
    name: "location_ai_image",
    description:
      "Generate an AI image for a location. Requires authentication and an image provider configured.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Location UUID" },
      },
      required: ["id"],
    },
    handler: (args) => postAPI(`/api/locations/${args.id}/ai-image`),
  },
  {
    name: "location_publish",
    description: "Publish a location to the marketplace. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Location UUID" },
      },
      required: ["id"],
    },
    handler: (args) => postAPI(`/api/locations/${args.id}/publish`),
  },
  {
    name: "location_unpublish",
    description: "Remove a location from the marketplace. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Location UUID" },
      },
      required: ["id"],
    },
    handler: (args) => postAPI(`/api/locations/${args.id}/unpublish`),
  },
  {
    name: "get_location_blueprint",
    description: "Get the visual blueprint/map for a location. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Location UUID" },
      },
      required: ["id"],
    },
    handler: (args) => fetchAPI(`/api/locations/${args.id}/blueprint`),
  },
  {
    name: "entity_explorer_chat_location",
    description:
      "Explore a location via the Entity Explorer. Describe a change to a location and see which scenes are affected. The AI finds relevant chapters and analyzes ripple effects. Requires authentication and BYOK AI provider.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Location UUID" },
        question: { type: "string", description: "The question or change to explore" },
        history: {
          type: "array",
          items: {
            type: "object",
            properties: {
              role: { type: "string", enum: ["user", "assistant"] },
              content: { type: "string" },
            },
          },
          description: "Previous conversation turns",
        },
        book_id: { type: "string", description: "Book UUID for semantic search context" },
      },
      required: ["id", "question"],
    },
    handler: (args) => {
      const body = { question: args.question };
      if (args.history) body.history = args.history;
      if (args.book_id) body.book_id = args.book_id;
      return postAPI(`/api/locations/${args.id}/explorer/chat`, body);
    },
  },

  // ── Creatures ──
  {
    name: "list_creatures",
    description: "List your creatures in the compendium. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Max results (default 50)" },
      },
    },
    handler: (args) => {
      const limit = args.limit || 50;
      return fetchAPI(`/api/creatures?limit=${limit}`);
    },
  },
  {
    name: "get_creature",
    description: "Get a creature's full profile by ID. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Creature UUID" },
      },
      required: ["id"],
    },
    handler: (args) => fetchAPI(`/api/creatures/${args.id}`),
  },
  {
    name: "create_creature",
    description:
      "Create a new creature in the compendium. Name and species_type required. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Creature name (required)" },
        species_type: { type: "string", description: "Species type (required, e.g. 'dragon', 'familiar')" },
        description: { type: "string", description: "General description" },
        habitat: { type: "string", description: "Natural habitat" },
        behavior: { type: "string", description: "Behavioral patterns" },
        abilities: { type: "string", description: "Special abilities" },
        weaknesses: { type: "string", description: "Weaknesses" },
        personality: { type: "string", description: "Personality traits" },
        motivations: { type: "string", description: "Drives and goals" },
        backstory: { type: "string", description: "Origin story" },
        lore: { type: "string", description: "Cultural lore and legends" },
        threat_level: { type: "string", description: "Threat level" },
        era: { type: "string", description: "Time period" },
        notes: { type: "string", description: "Additional notes" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags",
        },
      },
      required: ["name", "species_type"],
    },
    handler: (args) => postAPI("/api/creatures", args),
  },
  {
    name: "update_creature",
    description:
      "Update a creature's fields. Pass only the fields to change. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Creature UUID" },
        name: { type: "string", description: "Name" },
        species_type: { type: "string", description: "Species type" },
        description: { type: "string", description: "Description" },
        habitat: { type: "string", description: "Habitat" },
        behavior: { type: "string", description: "Behavior" },
        abilities: { type: "string", description: "Abilities" },
        weaknesses: { type: "string", description: "Weaknesses" },
        personality: { type: "string", description: "Personality" },
        motivations: { type: "string", description: "Motivations" },
        backstory: { type: "string", description: "Backstory" },
        lore: { type: "string", description: "Lore" },
        threat_level: { type: "string", description: "Threat level" },
        era: { type: "string", description: "Era" },
        notes: { type: "string", description: "Notes" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags",
        },
      },
      required: ["id"],
    },
    handler: (args) => {
      const { id, ...fields } = args;
      return putAPI(`/api/creatures/${id}`, fields);
    },
  },
  {
    name: "delete_creature",
    description: "Delete a creature permanently. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Creature UUID" },
      },
      required: ["id"],
    },
    handler: (args) => deleteAPI(`/api/creatures/${args.id}`),
  },
  {
    name: "ai_generate_creature",
    description:
      "Generate a complete creature using AI. Provide optional hints. Requires authentication and an AI provider.",
    inputSchema: {
      type: "object",
      properties: {
        species_type: { type: "string", description: "Type of creature (e.g. 'dragon', 'spirit beast')" },
        habitat_type: { type: "string", description: "Habitat (e.g. 'deep ocean', 'volcanic')" },
        era: { type: "string", description: "Time period" },
      },
    },
    handler: (args) =>
      postAPI("/api/creatures/ai-generate", {
        species_type: args.species_type || "",
        habitat_type: args.habitat_type || "",
        era: args.era || "",
      }),
  },
  {
    name: "creature_ai_image",
    description:
      "Generate an AI image for a creature. Requires authentication and an image provider.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Creature UUID" },
      },
      required: ["id"],
    },
    handler: (args) => postAPI(`/api/creatures/${args.id}/ai-image`),
  },
  {
    name: "creature_portrait_generate",
    description:
      "Generate an AI portrait for a creature. Requires authentication and an image provider.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Creature UUID" },
      },
      required: ["id"],
    },
    handler: (args) => postAPI(`/api/creatures/${args.id}/portrait/generate`),
  },
  {
    name: "creature_publish",
    description: "Publish a creature to the marketplace. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Creature UUID" },
      },
      required: ["id"],
    },
    handler: (args) => postAPI(`/api/creatures/${args.id}/publish`),
  },
  {
    name: "creature_unpublish",
    description: "Remove a creature from the marketplace. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Creature UUID" },
      },
      required: ["id"],
    },
    handler: (args) => postAPI(`/api/creatures/${args.id}/unpublish`),
  },
  {
    name: "creature_suggestions",
    description:
      "Get AI suggestions for a creature field. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Creature UUID" },
        field: {
          type: "string",
          description: "Field to get suggestions for",
        },
      },
      required: ["id", "field"],
    },
    handler: (args) =>
      postAPI(`/api/creatures/${args.id}/suggestions`, { field: args.field }),
  },
  {
    name: "entity_explorer_chat_creature",
    description:
      "Interview a creature via the Entity Explorer. Chat with the creature in character — the AI responds as the creature, grounded in your chapter content, entity details, and relationships. Requires authentication and BYOK AI provider.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Creature UUID" },
        question: { type: "string", description: "The question to ask the creature" },
        history: {
          type: "array",
          items: {
            type: "object",
            properties: {
              role: { type: "string", enum: ["user", "assistant"] },
              content: { type: "string" },
            },
          },
          description: "Previous conversation turns",
        },
        book_id: { type: "string", description: "Book UUID for semantic search context" },
      },
      required: ["id", "question"],
    },
    handler: (args) => {
      const body = { question: args.question };
      if (args.history) body.history = args.history;
      if (args.book_id) body.book_id = args.book_id;
      return postAPI(`/api/creatures/${args.id}/explorer/chat`, body);
    },
  },

  // ── Plots ──
  {
    name: "list_plots",
    description: "List your plots in the compendium. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Max results (default 50)" },
      },
    },
    handler: (args) => {
      const limit = args.limit || 50;
      return fetchAPI(`/api/plots?limit=${limit}`);
    },
  },
  {
    name: "get_plot",
    description: "Get a plot's full details including acts, scenes, and beats. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Plot UUID" },
      },
      required: ["id"],
    },
    handler: (args) => fetchAPI(`/api/plots/${args.id}`),
  },
  {
    name: "create_plot",
    description:
      "Create a new plot in the compendium. Only title is required. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Plot title (required)" },
        genre: { type: "string", description: "Genre (e.g. fantasy, thriller)" },
        tone: { type: "string", description: "Narrative tone" },
        setting_summary: { type: "string", description: "Brief setting description" },
        central_conflict: { type: "string", description: "Core conflict" },
        plot_style: { type: "string", description: "Plot structure style" },
        notes: { type: "string", description: "Additional notes" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags",
        },
      },
      required: ["title"],
    },
    handler: (args) => postAPI("/api/plots", args),
  },
  {
    name: "update_plot",
    description:
      "Update a plot's fields. Pass only the fields to change. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Plot UUID" },
        title: { type: "string", description: "Title" },
        genre: { type: "string", description: "Genre" },
        tone: { type: "string", description: "Tone" },
        setting_summary: { type: "string", description: "Setting summary" },
        central_conflict: { type: "string", description: "Central conflict" },
        plot_style: { type: "string", description: "Plot style" },
        notes: { type: "string", description: "Notes" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags",
        },
      },
      required: ["id"],
    },
    handler: (args) => {
      const { id, ...fields } = args;
      return putAPI(`/api/plots/${id}`, fields);
    },
  },
  {
    name: "delete_plot",
    description: "Delete a plot permanently. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Plot UUID" },
      },
      required: ["id"],
    },
    handler: (args) => deleteAPI(`/api/plots/${args.id}`),
  },
  {
    name: "plot_add_act",
    description:
      "Add an act to a plot. Acts are the top-level structure of a plot. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        plot_id: { type: "string", description: "Plot UUID" },
        title: { type: "string", description: "Act title (required)" },
        summary: { type: "string", description: "Act summary" },
        purpose: { type: "string", description: "Narrative purpose" },
        notes: { type: "string", description: "Notes" },
      },
      required: ["plot_id", "title"],
    },
    handler: (args) =>
      postAPI(`/api/plots/${args.plot_id}/acts`, {
        title: args.title,
        summary: args.summary || "",
        purpose: args.purpose || "",
        notes: args.notes || "",
      }),
  },
  {
    name: "plot_ai_acts",
    description:
      "Generate acts for a plot using AI. Requires authentication and an AI provider.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Plot UUID" },
      },
      required: ["id"],
    },
    handler: (args) => postAPI(`/api/plots/${args.id}/ai-acts`),
  },
  {
    name: "plot_add_scene",
    description:
      "Add a scene to a plot act. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        plot_id: { type: "string", description: "Plot UUID" },
        act_id: { type: "string", description: "Act UUID" },
        title: { type: "string", description: "Scene title (required)" },
        summary: { type: "string", description: "Scene summary" },
        notes: { type: "string", description: "Notes" },
      },
      required: ["plot_id", "act_id", "title"],
    },
    handler: (args) =>
      postAPI(`/api/plots/${args.plot_id}/acts/${args.act_id}/scenes`, {
        title: args.title,
        summary: args.summary || "",
        notes: args.notes || "",
      }),
  },
  {
    name: "plot_ai_scenes",
    description:
      "Generate scenes for a plot act using AI. Requires authentication and an AI provider.",
    inputSchema: {
      type: "object",
      properties: {
        plot_id: { type: "string", description: "Plot UUID" },
        act_id: { type: "string", description: "Act UUID" },
      },
      required: ["plot_id", "act_id"],
    },
    handler: (args) =>
      postAPI(`/api/plots/${args.plot_id}/acts/${args.act_id}/ai-scenes`),
  },
  {
    name: "plot_ai_image",
    description:
      "Generate an AI image for a plot. Requires authentication and an image provider.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Plot UUID" },
      },
      required: ["id"],
    },
    handler: (args) => postAPI(`/api/plots/${args.id}/ai-image`),
  },
  {
    name: "plot_publish",
    description: "Publish a plot to the marketplace. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Plot UUID" },
      },
      required: ["id"],
    },
    handler: (args) => postAPI(`/api/plots/${args.id}/publish`),
  },
  {
    name: "plot_unpublish",
    description: "Remove a plot from the marketplace. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Plot UUID" },
      },
      required: ["id"],
    },
    handler: (args) => postAPI(`/api/plots/${args.id}/unpublish`),
  },

  // ── Plot Designer (Book-level) ──
  {
    name: "list_plot_templates",
    description: "List available plot structure templates (Three-Act, Hero's Journey, etc.).",
    inputSchema: { type: "object", properties: {} },
    handler: () => fetchAPI("/api/plot-templates"),
  },
  {
    name: "get_book_plot",
    description: "Get the plot linked to a book, including all acts, scenes, and beats. Returns {plot: null} if no plot exists. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        book_id: { type: "string", description: "Book UUID" },
      },
      required: ["book_id"],
    },
    handler: (args) => fetchAPI(`/api/books/${args.book_id}/plot`),
  },
  {
    name: "create_book_plot_from_template",
    description: "Create a plot for a book from a template. The book must not already have a plot. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        book_id: { type: "string", description: "Book UUID" },
        template_id: { type: "string", description: "Template ID from list_plot_templates" },
      },
      required: ["book_id", "template_id"],
    },
    handler: (args) => postAPI(`/api/books/${args.book_id}/plot/from-template`, { template_id: args.template_id }),
  },
  {
    name: "get_plot_synopsis",
    description: "Read the cached AI-generated synopsis for a book's plot. Returns the synopsis text along with the hash and generated-at timestamp. This does NOT trigger regeneration — it only reads the existing cached value from the plot record. Returns null synopsis if none has been generated yet. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        book_id: { type: "string", description: "Book UUID" },
      },
      required: ["book_id"],
    },
    handler: async (args) => {
      const result = await fetchAPI(`/api/books/${args.book_id}/plot`);
      if (!result || !result.plot) {
        return { synopsis: null, hash: null, generated_at: null };
      }
      return {
        synopsis: result.plot.synopsis || null,
        hash: result.plot.synopsis_hash || null,
        generated_at: result.plot.synopsis_generated_at || null,
      };
    },
  },
  {
    name: "regenerate_plot_synopsis",
    description: "Force regeneration of the AI synopsis for a book's plot. Calls the user's BYOK LLM to produce a fresh 2-3 sentence summary derived from the plot's acts, scenes, and beats. If the plot's content hash hasn't drifted since the last generation, the cached value is returned without an LLM call. Requires authentication and a configured AI provider (BYOK).",
    inputSchema: {
      type: "object",
      properties: {
        book_id: { type: "string", description: "Book UUID" },
      },
      required: ["book_id"],
    },
    handler: (args) => postAPI(`/api/books/${args.book_id}/plot/synopsis`, {}),
  },
  {
    name: "update_plot_scene",
    description:
      "Update fields on a plot scene. Pass only the fields you want to change. To move the scene to a different act in the same plot, pass act_id (and optionally sort_order). Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        plot_id: { type: "string", description: "Plot UUID" },
        scene_id: { type: "string", description: "Scene UUID" },
        title: { type: "string" },
        summary: { type: "string" },
        purpose: { type: "string" },
        style_hint: { type: "string" },
        pov_character: { type: "string" },
        notes: { type: "string" },
        region_id: {
          type: ["string", "null"],
          description: "Location region UUID, or null to clear.",
        },
        area_id: {
          type: ["string", "null"],
          description: "Location area UUID (within a region), or null to clear.",
        },
        spot_id: {
          type: ["string", "null"],
          description: "Location spot UUID (within an area), or null to clear.",
        },
        act_id: {
          type: "string",
          description: "Move the scene to a different act in the same plot. Target act must belong to the same plot.",
        },
        sort_order: {
          type: "integer",
          description: "New ordinal position within the (possibly new) act.",
        },
      },
      required: ["plot_id", "scene_id"],
    },
    handler: (args) => {
      const { plot_id, scene_id, ...rest } = args;
      return putAPI(`/api/plots/${plot_id}/scenes/${scene_id}`, rest);
    },
  },
  {
    name: "get_plot_template",
    description:
      "Get a single plot template with full beat details (acts → beats → name + hint). Use with the structure overlay workflow or to inspect a template before applying it. The list_plot_templates tool returns summary-only data.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Template ID (e.g. 'three-act', 'save-the-cat', 'hero-journey', 'kishotenketsu'). Use list_plot_templates for the full set.",
        },
      },
      required: ["id"],
    },
    handler: (args) => fetchAPI(`/api/plot-templates/${args.id}`),
  },
  {
    name: "create_plot_beat",
    description:
      "Create a beat under a scene in a plot. Beats are the third level of the Plot Canvas — each beat is an editorial moment inside a scene (e.g. a dialogue exchange, a reveal, an internal shift). sort_order is auto-assigned at the end of the scene's existing beats. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        plot_id: { type: "string", description: "Plot UUID" },
        scene_id: { type: "string", description: "Scene UUID (must belong to the plot)" },
        title: { type: "string", description: "Beat title (required)" },
        description: { type: "string", description: "Beat description / editorial notes" },
        beat_type: { type: "string", description: "Optional type tag (e.g. 'action', 'dialogue', 'internal', 'reveal')" },
        notes: { type: "string", description: "Freeform notes" },
        region_id: { type: ["string", "null"], description: "Location region UUID, or null to leave unset" },
        area_id: { type: ["string", "null"], description: "Location area UUID, or null" },
        spot_id: { type: ["string", "null"], description: "Location spot UUID, or null" },
      },
      required: ["plot_id", "scene_id", "title"],
    },
    handler: (args) => {
      const { plot_id, scene_id, ...body } = args;
      return postAPI(`/api/plots/${plot_id}/scenes/${scene_id}/beats`, body);
    },
  },
  {
    name: "update_plot_beat",
    description:
      "Update fields on an existing plot beat. Pass only the fields you want to change. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        plot_id: { type: "string", description: "Plot UUID" },
        beat_id: { type: "string", description: "Beat UUID" },
        title: { type: "string" },
        description: { type: "string" },
        beat_type: { type: "string" },
        notes: { type: "string" },
        region_id: { type: ["string", "null"], description: "Location region UUID, or null to clear" },
        area_id: { type: ["string", "null"], description: "Location area UUID, or null to clear" },
        spot_id: { type: ["string", "null"], description: "Location spot UUID, or null to clear" },
      },
      required: ["plot_id", "beat_id"],
    },
    handler: (args) => {
      const { plot_id, beat_id, ...rest } = args;
      return putAPI(`/api/plots/${plot_id}/beats/${beat_id}`, rest);
    },
  },
  {
    name: "delete_plot_beat",
    description: "Delete a plot beat by UUID. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        plot_id: { type: "string", description: "Plot UUID" },
        beat_id: { type: "string", description: "Beat UUID" },
      },
      required: ["plot_id", "beat_id"],
    },
    handler: (args) => deleteAPI(`/api/plots/${args.plot_id}/beats/${args.beat_id}`),
  },
  {
    name: "reorder_plot_beats",
    description:
      "Reorder beats within a scene. Pass a list of {id, sort_order} objects — typically the full current beat list with their new sort orders. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        plot_id: { type: "string", description: "Plot UUID" },
        scene_id: { type: "string", description: "Scene UUID (must belong to the plot)" },
        items: {
          type: "array",
          description: "Ordered list of beats with their target sort_order",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "Beat UUID" },
              sort_order: { type: "integer", description: "Target ordinal position" },
            },
            required: ["id", "sort_order"],
          },
        },
      },
      required: ["plot_id", "scene_id", "items"],
    },
    handler: (args) => {
      return putAPI(`/api/plots/${args.plot_id}/scenes/${args.scene_id}/beats/reorder`, args.items);
    },
  },
  {
    name: "delete_book_plot",
    description: "Delete the plot linked to a book. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        book_id: { type: "string", description: "Book UUID" },
      },
      required: ["book_id"],
    },
    handler: (args) => deleteAPI(`/api/books/${args.book_id}/plot`),
  },
  {
    name: "get_beat_suggestions",
    description: "Get story evidence suggestions for a specific beat. Uses three tiers: chapter analysis, text stats, and semantic search. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        book_id: { type: "string", description: "Book UUID" },
        beat_id: { type: "string", description: "Beat UUID" },
      },
      required: ["book_id", "beat_id"],
    },
    handler: (args) => fetchAPI(`/api/books/${args.book_id}/plot/beats/${args.beat_id}/suggestions`),
  },
  {
    name: "auto_map_plot",
    description: "Batch-map story content to all empty beats in a book's plot. Uses analysis + AI. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        book_id: { type: "string", description: "Book UUID" },
      },
      required: ["book_id"],
    },
    handler: (args) => postAPI(`/api/books/${args.book_id}/plot/auto-map`),
  },
  {
    name: "entity_explorer_chat_plot",
    description:
      "Explore a plot via the Entity Explorer. Explore branching possibilities, tension points, unresolved threads, and potential turning points. Requires authentication and BYOK AI provider.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Plot UUID" },
        question: { type: "string", description: "The question or direction to explore" },
        history: {
          type: "array",
          items: {
            type: "object",
            properties: {
              role: { type: "string", enum: ["user", "assistant"] },
              content: { type: "string" },
            },
          },
          description: "Previous conversation turns",
        },
        book_id: { type: "string", description: "Book UUID for semantic search context" },
      },
      required: ["id", "question"],
    },
    handler: (args) => {
      const body = { question: args.question };
      if (args.history) body.history = args.history;
      if (args.book_id) body.book_id = args.book_id;
      return postAPI(`/api/plots/${args.id}/explorer/chat`, body);
    },
  },

  // ── Family Trees ──
  {
    name: "list_trees",
    description: "List your family trees. Requires authentication.",
    inputSchema: { type: "object", properties: {} },
    handler: () => fetchAPI("/api/trees"),
  },
  {
    name: "get_tree_members",
    description: "Get all members (characters and creatures) in a family tree. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Tree UUID" },
      },
      required: ["id"],
    },
    handler: (args) => fetchAPI(`/api/trees/${args.id}/members`),
  },
  {
    name: "create_tree",
    description: "Create a new family tree. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Tree name (required)" },
        description: { type: "string", description: "Tree description" },
      },
      required: ["name"],
    },
    handler: (args) =>
      postAPI("/api/trees", {
        name: args.name,
        description: args.description || "",
      }),
  },
  {
    name: "update_tree",
    description: "Update a family tree's name or description. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Tree UUID" },
        name: { type: "string", description: "New name" },
        description: { type: "string", description: "New description" },
      },
      required: ["id"],
    },
    handler: (args) => {
      const { id, ...fields } = args;
      return putAPI(`/api/trees/${id}`, fields);
    },
  },
  {
    name: "delete_tree",
    description: "Delete a family tree permanently. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Tree UUID" },
      },
      required: ["id"],
    },
    handler: (args) => deleteAPI(`/api/trees/${args.id}`),
  },
  {
    name: "tree_add_member",
    description:
      "Add a character or creature to a family tree. Provide either character_id or creature_id. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        tree_id: { type: "string", description: "Tree UUID" },
        character_id: { type: "string", description: "Character UUID (provide this OR creature_id)" },
        creature_id: { type: "string", description: "Creature UUID (provide this OR character_id)" },
        pos_x: { type: "number", description: "X position on the tree (default 0)" },
        pos_y: { type: "number", description: "Y position on the tree (default 0)" },
      },
      required: ["tree_id"],
    },
    handler: (args) => {
      const body = {};
      if (args.character_id) body.character_id = args.character_id;
      if (args.creature_id) body.creature_id = args.creature_id;
      body.pos_x = args.pos_x || 0;
      body.pos_y = args.pos_y || 0;
      return postAPI(`/api/trees/${args.tree_id}/members`, body);
    },
  },
  {
    name: "tree_generate",
    description:
      "Generate family tree members using AI based on existing characters. Requires authentication and an AI provider.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Tree UUID" },
      },
      required: ["id"],
    },
    handler: (args) => postAPI(`/api/trees/${args.id}/generate`),
  },
  {
    name: "tree_publish",
    description: "Publish a family tree to the marketplace. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Tree UUID" },
      },
      required: ["id"],
    },
    handler: (args) => postAPI(`/api/trees/${args.id}/publish`),
  },
  {
    name: "tree_unpublish",
    description: "Remove a family tree from the marketplace. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Tree UUID" },
      },
      required: ["id"],
    },
    handler: (args) => postAPI(`/api/trees/${args.id}/unpublish`),
  },

  // ── Books ──
  {
    name: "list_books",
    description: "List your books. Requires authentication.",
    inputSchema: { type: "object", properties: {} },
    handler: () => fetchAPI("/api/books"),
  },
  {
    name: "list_my_stories",
    description:
      "List the user's books that have a linked plot (i.e. the user's Stories). Returns the same shape as list_books but filtered to only books that have been started as a story by applying a structure template. Useful for 'what stories am I working on?' or 'what's the latest thing I've been writing?'. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: () => fetchAPI("/api/books?has_plot=1"),
  },
  {
    name: "search_my_stories",
    description:
      "Full-text search across the user's Stories (books with linked plots). Matches against book title, subtitle, blurb, plot title, central conflict, setting summary, plot synopsis, and any character linked to the plot (by name or bio). Returns results in relevance order. Useful for 'find my story about Elena' or 'the one with the zeppelin'. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
    },
    handler: (args) => fetchAPI("/api/books?has_plot=1&q=" + encodeURIComponent(args.query)),
  },
  {
    name: "get_book",
    description: "Get a book's details including metadata and linked entities. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Book UUID" },
      },
      required: ["id"],
    },
    handler: (args) => fetchAPI(`/api/books/${args.id}`),
  },
  {
    name: "create_book",
    description:
      "Create a new book. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Book title (required)" },
        book_type: {
          type: "string",
          description: "Type: novel, poetry_collection, essay_collection, screenplay (required)",
        },
        screenplay_format: {
          type: "string",
          description: "Required for screenplay: feature_film, tv_drama, single_cam_comedy, multi_cam_sitcom, stage_play",
        },
      },
      required: ["title", "book_type"],
    },
    handler: (args) => {
      const body = { title: args.title, book_type: args.book_type };
      if (args.screenplay_format) body.screenplay_format = args.screenplay_format;
      return postAPI("/api/books", body);
    },
  },
  {
    name: "update_book",
    description:
      "Update a book's metadata. Pass only fields to change. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Book UUID" },
        title: { type: "string", description: "Title" },
        subtitle: { type: "string", description: "Subtitle" },
        blurb: { type: "string", description: "Book blurb/description" },
        book_type: { type: "string", description: "Book type" },
        genre: { type: "string", description: "Genre" },
        author_name: { type: "string", description: "Author display name" },
        target_word_count: { type: "integer", description: "Target word count" },
        published: { type: "boolean", description: "Whether the book is published" },
        screenplay_format: {
          type: "string",
          description: "Required for screenplay: feature_film, tv_drama, single_cam_comedy, multi_cam_sitcom, stage_play",
        },
        screenplay_font: {
          type: "string",
          description: "Font: courier_prime, courier, times_new_roman, arial",
        },
        screenplay_title_page: {
          type: "string",
          description: "Title page metadata as JSON object",
        },
      },
      required: ["id"],
    },
    handler: (args) => {
      const { id, ...fields } = args;
      return patchAPI(`/api/books/${id}`, fields);
    },
  },
  {
    name: "delete_book",
    description: "Delete a book and all its chapters. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Book UUID" },
      },
      required: ["id"],
    },
    handler: (args) => deleteAPI(`/api/books/${args.id}`),
  },
  {
    name: "list_chapters",
    description: "List all chapters in a book. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        book_id: { type: "string", description: "Book UUID" },
      },
      required: ["book_id"],
    },
    handler: (args) => fetchAPI(`/api/books/${args.book_id}/chapters`),
  },
  {
    name: "get_chapter",
    description: "Get a chapter's content and metadata. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        book_id: { type: "string", description: "Book UUID" },
        chapter_id: { type: "string", description: "Chapter UUID" },
      },
      required: ["book_id", "chapter_id"],
    },
    handler: (args) =>
      fetchAPI(`/api/books/${args.book_id}/chapters/${args.chapter_id}`),
  },
  {
    name: "create_chapter",
    description:
      "Create a new chapter in a book. If plot_scene_id is provided, the chapter is linked to that plot scene (the scene must belong to a plot you own). Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        book_id: { type: "string", description: "Book UUID" },
        title: { type: "string", description: "Chapter title (required)" },
        chapter_type: {
          type: "string",
          description: "Type: chapter, prologue, epilogue, interlude, appendix (required)",
        },
        plot_scene_id: {
          type: "string",
          description: "Optional: link the new chapter to this plot scene UUID. Used by the Plot Canvas 'Create chapter from this scene' flow.",
        },
      },
      required: ["book_id", "title", "chapter_type"],
    },
    handler: (args) => {
      const body = { title: args.title, chapter_type: args.chapter_type };
      if (args.plot_scene_id) body.plot_scene_id = args.plot_scene_id;
      return postAPI(`/api/books/${args.book_id}/chapters`, body);
    },
  },
  {
    name: "update_chapter",
    description:
      "Update a chapter's content or metadata. Pass only fields to change. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        book_id: { type: "string", description: "Book UUID" },
        chapter_id: { type: "string", description: "Chapter UUID" },
        title: { type: "string", description: "Chapter title" },
        subtitle: { type: "string", description: "Chapter subtitle" },
        chapter_type: { type: "string", description: "Chapter type" },
        status: { type: "string", description: "Status: draft, revision, final" },
      },
      required: ["book_id", "chapter_id"],
    },
    handler: (args) => {
      const { book_id, chapter_id, ...fields } = args;
      return patchAPI(`/api/books/${book_id}/chapters/${chapter_id}`, fields);
    },
  },
  {
    name: "delete_chapter",
    description: "Delete a chapter from a book. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        book_id: { type: "string", description: "Book UUID" },
        chapter_id: { type: "string", description: "Chapter UUID" },
      },
      required: ["book_id", "chapter_id"],
    },
    handler: (args) =>
      deleteAPI(`/api/books/${args.book_id}/chapters/${args.chapter_id}`),
  },
  {
    name: "reorder_chapters",
    description: "Reorder chapters in a book. Provide the chapter IDs in the desired order. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        book_id: { type: "string", description: "Book UUID" },
        chapter_ids: {
          type: "array",
          items: { type: "string" },
          description: "Chapter UUIDs in desired order",
        },
      },
      required: ["book_id", "chapter_ids"],
    },
    handler: (args) =>
      putAPI(`/api/books/${args.book_id}/chapters/reorder`, {
        chapter_ids: args.chapter_ids,
      }),
  },
  {
    name: "book_link_entity",
    description:
      "Link a compendium entity (character, creature, location, plot, or family tree) to a book. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        book_id: { type: "string", description: "Book UUID" },
        entity_type: {
          type: "string",
          enum: ["characters", "creatures", "locations", "plots", "trees"],
          description: "Entity type to link",
        },
        entity_id: { type: "string", description: "Entity UUID" },
      },
      required: ["book_id", "entity_type", "entity_id"],
    },
    handler: (args) =>
      postAPI(`/api/books/${args.book_id}/${args.entity_type}`, {
        id: args.entity_id,
      }),
  },
  {
    name: "book_unlink_entity",
    description:
      "Remove a linked entity from a book. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        book_id: { type: "string", description: "Book UUID" },
        entity_type: {
          type: "string",
          enum: ["characters", "creatures", "locations", "plots", "trees"],
          description: "Entity type",
        },
        entity_id: { type: "string", description: "Entity UUID" },
      },
      required: ["book_id", "entity_type", "entity_id"],
    },
    handler: (args) =>
      deleteAPI(
        `/api/books/${args.book_id}/${args.entity_type}/${args.entity_id}`
      ),
  },
  {
    name: "export_book",
    description: "Export a book's content in various formats. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Book UUID" },
        format: {
          type: "string",
          enum: ["json", "markdown", "html", "epub", "pdf", "fdx", "fountain"],
          description: "Export format (default: json). Use fdx for Final Draft XML, fountain for Fountain screenplay format.",
        },
      },
      required: ["id"],
    },
    handler: (args) => {
      const qs = args.format ? `?format=${args.format}` : "";
      return fetchAPI(`/api/books/${args.id}/export${qs}`);
    },
  },
  {
    name: "import_fountain",
    description: "Import a Fountain screenplay as a new book. Sends the raw Fountain text. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Fountain screenplay content" },
      },
      required: ["text"],
    },
    handler: async (args) => {
      const headers = { "Content-Type": "text/plain" };
      if (sessionToken) {
        headers["Authorization"] = `Bearer ${sessionToken}`;
      }
      const res = await fetch(`${API_BASE}/api/books/import/fountain`, {
        method: "POST",
        headers,
        body: args.text,
      });
      return handleResponse(res);
    },
  },
  {
    name: "get_public_book",
    description: "Get a published book's public information (no auth required).",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Book UUID" },
      },
      required: ["id"],
    },
    handler: (args) => fetchAPI(`/api/books/${args.id}/public`),
  },

  // ── Canvases ──
  {
    name: "list_canvases",
    description: "List your canvases (collaborative drawing boards). Requires authentication.",
    inputSchema: { type: "object", properties: {} },
    handler: () => fetchAPI("/api/canvases/mine"),
  },
  {
    name: "get_canvas",
    description: "Get a canvas with its nodes and metadata. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Canvas UUID" },
      },
      required: ["id"],
    },
    handler: (args) => fetchAPI(`/api/canvases/${args.id}`),
  },
  {
    name: "create_canvas",
    description: "Create a new canvas in a group. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        group_id: { type: "string", description: "Group UUID (required)" },
        name: { type: "string", description: "Canvas name (required)" },
      },
      required: ["group_id", "name"],
    },
    handler: (args) =>
      postAPI(`/api/groups/${args.group_id}/canvases`, {
        name: args.name,
      }),
  },
  {
    name: "update_canvas",
    description: "Update a canvas name. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Canvas UUID" },
        name: { type: "string", description: "New name (required)" },
      },
      required: ["id", "name"],
    },
    handler: (args) =>
      putAPI(`/api/canvases/${args.id}`, { name: args.name }),
  },
  {
    name: "delete_canvas",
    description: "Delete a canvas permanently. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Canvas UUID" },
      },
      required: ["id"],
    },
    handler: (args) => deleteAPI(`/api/canvases/${args.id}`),
  },

  // ── Research ──
  {
    name: "research_search",
    description:
      "Semantic search across your research notes, highlights, and analyzed content. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        owner_id: { type: "string", description: "Work or book UUID that owns the research" },
        query: { type: "string", description: "Search query (required)" },
        limit: { type: "integer", description: "Max results (default 10)" },
      },
      required: ["owner_id", "query"],
    },
    handler: (args) =>
      postAPI(`/api/research/${args.owner_id}/search`, {
        query: args.query,
        limit: args.limit || 10,
      }),
  },
  {
    name: "research_analyze_chapter",
    description:
      "Trigger tiered analysis of a chapter. Core (Tier 1) extracts characters, themes, arcs, and interactions. Deep (Tier 2) adds voice profiles, foreshadowing, craft metrics, and editorial summary (requires cloud AI). Requires authentication and an AI provider.",
    inputSchema: {
      type: "object",
      properties: {
        owner_id: { type: "string", description: "Book UUID" },
        chapter_id: { type: "string", description: "Chapter UUID" },
      },
      required: ["owner_id", "chapter_id"],
    },
    handler: (args) =>
      postAPI(
        `/api/research/${args.owner_id}/chapters/${args.chapter_id}/analyze`
      ),
  },
  {
    name: "research_intelligence",
    description:
      "Get aggregated intelligence about a work: character appearances, themes, timeline. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        owner_id: { type: "string", description: "Work or book UUID" },
      },
      required: ["owner_id"],
    },
    handler: (args) =>
      fetchAPI(`/api/research/${args.owner_id}/intelligence`),
  },
  {
    name: "research_character_graph",
    description:
      "Get a character's relationship graph and arc across the work. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        owner_id: { type: "string", description: "Work or book UUID" },
        character_name: {
          type: "string",
          description: "Character name as it appears in the text",
        },
      },
      required: ["owner_id", "character_name"],
    },
    handler: (args) =>
      fetchAPI(
        `/api/research/${args.owner_id}/graph/character/${encodeURIComponent(args.character_name)}`
      ),
  },

  // ── Story Graph ──
  {
    name: "writing_graph_rebuild",
    description:
      "Rebuild the story graph for a book from stored text_stats. Runs in background with WebSocket progress. Use for catch-up when chapters were analyzed before graph pipeline existed. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        book_id: { type: "string", description: "Book UUID" },
      },
      required: ["book_id"],
    },
    handler: (args) =>
      fetchAPI(`/api/books/${args.book_id}/graph/rebuild`, { method: "POST" }),
  },

  // ── Observatory (Insights) ──
  {
    name: "observatory_insights",
    description:
      "Get writing insights and patterns discovered from your work. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Max insights (default 20)" },
      },
    },
    handler: (args) => {
      const limit = args.limit || 20;
      return fetchAPI(`/api/observatory/insights?limit=${limit}`);
    },
  },
  {
    name: "observatory_stats",
    description:
      "Get writing statistics: word counts, writing streaks, productivity patterns. Requires authentication.",
    inputSchema: { type: "object", properties: {} },
    handler: () => fetchAPI("/api/observatory/stats"),
  },
  {
    name: "observatory_moments",
    description:
      "Get notable moments from your writing — breakthroughs, milestones, and patterns. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Max moments (default 20)" },
      },
    },
    handler: (args) => {
      const limit = args.limit || 20;
      return fetchAPI(`/api/observatory/moments?limit=${limit}`);
    },
  },
  {
    name: "observatory_ask",
    description:
      "Ask the observatory a question about your writing patterns, character development, or story structure. Requires authentication and an AI provider.",
    inputSchema: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "Your question about your writing (required)",
        },
      },
      required: ["question"],
    },
    handler: (args) =>
      postAPI("/api/observatory/ask", { question: args.question }),
  },
  {
    name: "observatory_summary",
    description:
      "Get an AI-generated summary of your writing journey and progress. Requires authentication.",
    inputSchema: { type: "object", properties: {} },
    handler: () => fetchAPI("/api/observatory/summary"),
  },
  {
    name: "book_character_evolution",
    description:
      "Get character evolution data for a book — current emotional state, driving forces, chapter-by-chapter timeline, and ghost characters detected in text but not in compendium. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        bookId: { type: "string", description: "Book UUID" },
      },
      required: ["bookId"],
    },
    handler: (args) =>
      fetchAPI(`/api/observatory/book/${args.bookId}/evolution`),
  },

  // ── Marketplace ──
  {
    name: "marketplace_browse",
    description:
      "Browse the marketplace for published characters, creatures, locations, plots, families, or books.",
    inputSchema: {
      type: "object",
      properties: {
        entity_type: {
          type: "string",
          enum: ["characters", "creatures", "locations", "plots", "families", "books"],
          description: "Type of entity to browse (required)",
        },
        limit: { type: "integer", description: "Max results (default 20)" },
      },
      required: ["entity_type"],
    },
    handler: (args) => {
      const limit = args.limit || 20;
      return fetchAPI(
        `/api/marketplace/${args.entity_type}?limit=${limit}`
      );
    },
  },
  {
    name: "marketplace_get",
    description: "Get detailed view of a marketplace item.",
    inputSchema: {
      type: "object",
      properties: {
        entity_type: {
          type: "string",
          enum: ["characters", "creatures", "locations", "plots", "families"],
          description: "Entity type",
        },
        id: { type: "string", description: "Entity UUID" },
      },
      required: ["entity_type", "id"],
    },
    handler: (args) =>
      fetchAPI(`/api/marketplace/${args.entity_type}/${args.id}`),
  },
  {
    name: "marketplace_fork",
    description:
      "Fork (copy) a marketplace item into your compendium. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        entity_type: {
          type: "string",
          enum: ["characters", "creatures", "locations", "plots", "families"],
          description: "Entity type to fork",
        },
        id: { type: "string", description: "Entity UUID to fork" },
      },
      required: ["entity_type", "id"],
    },
    handler: (args) =>
      postAPI(`/api/marketplace/${args.entity_type}/${args.id}/fork`),
  },

  // ── Library ──
  {
    name: "library_books",
    description:
      "List the 4 showcase books in the CivNode library. No authentication required.",
    inputSchema: { type: "object", properties: {} },
    handler: () => fetchAPI("/api/library/books"),
  },
  {
    name: "library_fork_book",
    description:
      "Fork a library book and all its entities (characters, locations, creatures, plots) into your collection. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        book_id: { type: "string", description: "Library book UUID" },
      },
      required: ["book_id"],
    },
    handler: (args) => postAPI(`/api/library/books/${args.book_id}/fork`),
  },

  // ── Compendium Entities (bulk) ──
  {
    name: "book_entities",
    description:
      "Get all compendium entities linked to a book in one call — characters, creatures, locations, plots, and family trees. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Book UUID" },
      },
      required: ["id"],
    },
    handler: (args) => fetchAPI(`/api/books/${args.id}/entities`),
  },
  {
    name: "compendium_unassigned",
    description:
      "Get compendium entities not linked to any book or work. Useful for finding orphaned characters, creatures, locations, plots, and trees. Requires authentication.",
    inputSchema: { type: "object", properties: {} },
    handler: () => fetchAPI("/api/compendium/unassigned"),
  },
  {
    name: "create_collection",
    description:
      "Create a new collection to group books and works together. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Collection title (required)" },
        description: { type: "string", description: "Optional description" },
      },
      required: ["title"],
    },
    handler: (args) => {
      const body = { title: args.title };
      if (args.description) body.description = args.description;
      return postAPI("/api/collections", body);
    },
  },
  {
    name: "list_collections",
    description:
      "List all collections for the authenticated user.",
    inputSchema: { type: "object", properties: {} },
    handler: () => getAPI("/api/collections"),
  },
  {
    name: "get_collection",
    description:
      "Get a collection with its items. Returns collection metadata and ordered list of books/works.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Collection ID (required)" },
      },
      required: ["id"],
    },
    handler: (args) => getAPI(`/api/collections/${args.id}`),
  },
  {
    name: "update_collection",
    description:
      "Update a collection's title or description. Pass only fields to change.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Collection ID (required)" },
        title: { type: "string", description: "New title" },
        description: { type: "string", description: "New description" },
      },
      required: ["id"],
    },
    handler: (args) => {
      const body = {};
      if (args.title !== undefined) body.title = args.title;
      if (args.description !== undefined) body.description = args.description;
      return patchAPI(`/api/collections/${args.id}`, body);
    },
  },
  {
    name: "delete_collection",
    description:
      "Delete a collection. Items inside are unlinked but not deleted.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Collection ID (required)" },
      },
      required: ["id"],
    },
    handler: (args) => deleteAPI(`/api/collections/${args.id}`),
  },
  {
    name: "collection_add_item",
    description:
      "Add a book or work to a collection. Provide either book_id or work_id.",
    inputSchema: {
      type: "object",
      properties: {
        collection_id: { type: "string", description: "Collection ID (required)" },
        book_id: { type: "string", description: "Book ID to add" },
        work_id: { type: "string", description: "Work ID to add" },
      },
      required: ["collection_id"],
    },
    handler: (args) => {
      const body = {};
      if (args.book_id) body.book_id = args.book_id;
      if (args.work_id) body.work_id = args.work_id;
      return postAPI(`/api/collections/${args.collection_id}/items`, body);
    },
  },
  {
    name: "collection_remove_item",
    description:
      "Remove an item from a collection. The original book/work is not deleted.",
    inputSchema: {
      type: "object",
      properties: {
        collection_id: { type: "string", description: "Collection ID (required)" },
        item_id: { type: "string", description: "Collection item ID to remove (required)" },
      },
      required: ["collection_id", "item_id"],
    },
    handler: (args) => deleteAPI(`/api/collections/${args.collection_id}/items/${args.item_id}`),
  },
  {
    name: "collection_reorder",
    description:
      "Reorder items in a collection. Provide the full ordered list of item IDs.",
    inputSchema: {
      type: "object",
      properties: {
        collection_id: { type: "string", description: "Collection ID (required)" },
        item_ids: { type: "array", items: { type: "string" }, description: "Ordered array of item IDs (required)" },
      },
      required: ["collection_id", "item_ids"],
    },
    handler: (args) => putAPI(`/api/collections/${args.collection_id}/items/reorder`, { item_ids: args.item_ids }),
  },
  {
    name: "marketplace_book_showcase",
    description:
      "Get a published book's full showcase — author info plus all published entities (characters, creatures, locations, plots, trees). No authentication required.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Book UUID" },
      },
      required: ["id"],
    },
    handler: (args) => fetchAPI(`/api/marketplace/books/${args.id}/showcase`),
  },
  {
    name: "marketplace_fork_book",
    description:
      "Fork a published marketplace book and all its entities into your collection. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Book UUID to fork" },
      },
      required: ["id"],
    },
    handler: (args) => postAPI(`/api/marketplace/books/${args.id}/fork`),
  },
  // ── Personal Letters ──
  {
    name: "personal_letter_inbox",
    description:
      "Get your personal letter inbox. Personal letters are direct, non-anonymous messages between users. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Max letters (default 20)" },
      },
    },
    handler: (args) => {
      const limit = args.limit || 20;
      return fetchAPI(`/api/letters/personal/inbox?limit=${limit}`);
    },
  },
  {
    name: "personal_letter_sent",
    description: "Get your sent personal letters. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Max letters (default 20)" },
      },
    },
    handler: (args) => {
      const limit = args.limit || 20;
      return fetchAPI(`/api/letters/personal/sent?limit=${limit}`);
    },
  },
  {
    name: "send_personal_letter",
    description:
      "Send a personal letter to another user. Unlike monument letters, these are not anonymous. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        recipient_alias: {
          type: "string",
          description: "Recipient's alias (required)",
        },
        body: {
          type: "string",
          description: "Letter content (required)",
        },
      },
      required: ["recipient_alias", "body"],
    },
    handler: (args) =>
      postAPI("/api/letters/personal", {
        recipient_alias: args.recipient_alias,
        body: args.body,
      }),
  },
  {
    name: "read_personal_letter",
    description: "Read a specific personal letter. Marks it as read. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Letter UUID" },
      },
      required: ["id"],
    },
    handler: (args) => fetchAPI(`/api/letters/personal/${args.id}`),
  },

  // ── Topics ──
  {
    name: "list_topics",
    description: "List available topics (interest-based communities).",
    inputSchema: { type: "object", properties: {} },
    handler: () => fetchAPI("/api/topics"),
  },
  {
    name: "join_topic",
    description: "Join a topic community. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Topic UUID" },
      },
      required: ["id"],
    },
    handler: (args) => postAPI(`/api/topics/${args.id}/join`),
  },
  {
    name: "leave_topic",
    description: "Leave a topic community. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Topic UUID" },
      },
      required: ["id"],
    },
    handler: (args) => postAPI(`/api/topics/${args.id}/leave`),
  },

  // ── Highlights ──
  {
    name: "list_highlights",
    description:
      "List your text highlights across monuments and works. Requires authentication.",
    inputSchema: { type: "object", properties: {} },
    handler: () => fetchAPI("/api/highlights"),
  },
  {
    name: "create_highlight",
    description:
      "Create a text highlight on a monument or work. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        content_type: {
          type: "string",
          enum: ["monument", "work"],
          description: "Type of content to highlight",
        },
        content_id: { type: "string", description: "Content UUID" },
        color: {
          type: "string",
          description: "Highlight color (e.g. 'yellow', 'green', 'blue', 'pink')",
        },
        text_fragment: {
          type: "string",
          description: "The highlighted text",
        },
        start_offset: { type: "integer", description: "Start character offset" },
        end_offset: { type: "integer", description: "End character offset" },
      },
      required: [
        "content_type",
        "content_id",
        "color",
        "text_fragment",
        "start_offset",
        "end_offset",
      ],
    },
    handler: (args) =>
      postAPI("/api/highlights", {
        content_type: args.content_type,
        content_id: args.content_id,
        color: args.color,
        text_fragment: args.text_fragment,
        start_offset: args.start_offset,
        end_offset: args.end_offset,
      }),
  },
  {
    name: "delete_highlight",
    description: "Delete a highlight. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Highlight UUID" },
      },
      required: ["id"],
    },
    handler: (args) => deleteAPI(`/api/highlights/${args.id}`),
  },

  // ── Passage Comments ──
  {
    name: "passage_comments_inbox",
    description:
      "Get your passage comment inbox — comments others have left on your works. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        cursor: {
          type: "string",
          description: "Pagination cursor (RFC3339 timestamp, optional)",
        },
      },
    },
    handler: (args) => {
      const params = new URLSearchParams();
      if (args.cursor) params.set("cursor", args.cursor);
      const qs = params.toString();
      return fetchAPI(`/api/passage-comments/inbox${qs ? "?" + qs : ""}`);
    },
  },
  {
    name: "passage_comments_mine",
    description:
      "Get passage comments you have written on other people's works. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        cursor: {
          type: "string",
          description: "Pagination cursor (RFC3339 timestamp, optional)",
        },
      },
    },
    handler: (args) => {
      const params = new URLSearchParams();
      if (args.cursor) params.set("cursor", args.cursor);
      const qs = params.toString();
      return fetchAPI(`/api/passage-comments/mine${qs ? "?" + qs : ""}`);
    },
  },
  {
    name: "passage_comments_create",
    description:
      "Create a passage comment on a work or monument. Anchor a specific text selection for contextual feedback. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        content_type: {
          type: "string",
          enum: ["work", "monument"],
          description: "Type of content to comment on (required)",
        },
        content_id: {
          type: "string",
          description: "UUID of the work or monument (required)",
        },
        body: {
          type: "string",
          description: "Comment text (required)",
        },
        anchor_start: {
          type: "integer",
          description: "Start offset of the selected text passage (optional)",
        },
        anchor_end: {
          type: "integer",
          description: "End offset of the selected text passage (optional)",
        },
        anchor_text: {
          type: "string",
          description: "The selected text being commented on (optional)",
        },
      },
      required: ["content_type", "content_id", "body"],
    },
    handler: (args) =>
      postAPI("/api/passage-comments", {
        content_type: args.content_type,
        content_id: args.content_id,
        body: args.body,
        anchor_start: args.anchor_start ?? null,
        anchor_end: args.anchor_end ?? null,
        anchor_text: args.anchor_text || null,
      }),
  },
  {
    name: "passage_comments_list",
    description:
      "List passage comments for a specific work or monument. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        content_type: {
          type: "string",
          enum: ["work", "monument"],
          description: "Type of content (required)",
        },
        content_id: {
          type: "string",
          description: "UUID of the work or monument (required)",
        },
      },
      required: ["content_type", "content_id"],
    },
    handler: (args) =>
      fetchAPI(
        `/api/passage-comments?content_type=${encodeURIComponent(args.content_type)}&content_id=${encodeURIComponent(args.content_id)}`
      ),
  },
  {
    name: "passage_comments_reply",
    description:
      "Reply to a passage comment. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "UUID of the passage comment to reply to (required)",
        },
        body: {
          type: "string",
          description: "Reply text (required)",
        },
      },
      required: ["id", "body"],
    },
    handler: (args) =>
      postAPI(`/api/passage-comments/${args.id}/reply`, { body: args.body }),
  },
  {
    name: "passage_comments_delete",
    description:
      "Delete a passage comment. Only the author or content owner can delete. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "UUID of the passage comment (required)",
        },
      },
      required: ["id"],
    },
    handler: (args) => deleteAPI(`/api/passage-comments/${args.id}`),
  },
  {
    name: "passage_comments_resonate",
    description:
      "Leave quiet appreciation on a passage comment. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "UUID of the passage comment (required)",
        },
      },
      required: ["id"],
    },
    handler: (args) => postAPI(`/api/passage-comments/${args.id}/resonate`),
  },
  {
    name: "passage_comments_escalate",
    description:
      "Escalate a passage comment for moderation review. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "UUID of the passage comment (required)",
        },
      },
      required: ["id"],
    },
    handler: (args) => postAPI(`/api/passage-comments/${args.id}/escalate`),
  },
  {
    name: "passage_comments_mark_read",
    description:
      "Mark a passage comment as read. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "UUID of the passage comment (required)",
        },
      },
      required: ["id"],
    },
    handler: (args) => putAPI(`/api/passage-comments/${args.id}/read`),
  },
  {
    name: "passage_comments_dismiss",
    description:
      "Dismiss a passage comment from your inbox. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "UUID of the passage comment (required)",
        },
      },
      required: ["id"],
    },
    handler: (args) => putAPI(`/api/passage-comments/${args.id}/dismiss`),
  },

  // ── Users (Extended) ──
  {
    name: "search_users",
    description: "Search for users by alias or name.",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Search query (required)" },
        limit: { type: "integer", description: "Max results (default 10)" },
      },
      required: ["q"],
    },
    handler: (args) => {
      const params = new URLSearchParams({ q: args.q });
      if (args.limit) params.set("limit", String(args.limit));
      return fetchAPI(`/api/users/search?${params}`);
    },
  },
  {
    name: "get_notepad",
    description:
      "Get your personal notepad content. A private scratchpad for ideas. Requires authentication.",
    inputSchema: { type: "object", properties: {} },
    handler: () => fetchAPI("/api/users/notepad"),
  },
  {
    name: "update_notepad",
    description:
      "Update your personal notepad content. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "Notepad content in Markdown",
        },
      },
      required: ["content"],
    },
    handler: (args) =>
      putAPI("/api/users/notepad", { content: args.content }),
  },
  {
    name: "search_content",
    description:
      "Search across all public content on CivNode — monuments, works, forum threads, and more.",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Search query (required)" },
        limit: { type: "integer", description: "Max results (default 20)" },
      },
      required: ["q"],
    },
    handler: (args) => {
      const params = new URLSearchParams({ q: args.q });
      if (args.limit) params.set("limit", String(args.limit));
      return fetchAPI(`/api/search?${params}`);
    },
  },

  // ── AI Usage Logging ──
  {
    name: "ai_usage_log_local",
    description:
      "Log local AI usage (Ollama, ComfyUI calls made directly from the browser to a local service). Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        provider: {
          type: "string",
          description: 'Local AI provider: "ollama" or "comfyui"',
        },
        model: {
          type: "string",
          description: 'Model name, e.g. "llama3:8b", "comfyui-local"',
        },
        action: {
          type: "string",
          description:
            'What the call did, e.g. "proofread", "exploration", "chapter-analysis", "image-generate"',
        },
        success: {
          type: "boolean",
          description: "Whether the call succeeded",
        },
        duration_ms: {
          type: "number",
          description: "How long the call took in milliseconds",
        },
      },
      required: ["provider", "action"],
    },
    handler: (args) => postAPI("/api/settings/ai-usage/log-local", args),
  },

  // ── Link Preview ──
  {
    name: "link_preview",
    description:
      "Get a rich preview for an internal CivNode URL. Returns title, subtitle, description, image, author, and meta for published content. Returns 404 for private/unpublished content.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description:
            'Relative CivNode URL, e.g. /books/{id}/read, /civpage/alias, /u/alias/thread/slug, /works/{id}',
        },
      },
      required: ["url"],
    },
    handler: (args) =>
      fetchAPI(`/api/link-preview?url=${encodeURIComponent(args.url)}`),
  },

  // ── Speech Writing ──
  {
    name: "speech_analysis",
    description:
      "Return deterministic speech metrics for a chapter: delivery time, word and syllable counts, LIX and Flesch-Kincaid readability, breath-test warnings, filler-word and passive-voice counts, detected rhetorical devices, and per-sentence timing. All numbers come from LanguageTool plus rule-based Go packages — no LLM calls. Results are cached per content hash so repeat requests for an unchanged chapter return instantly.",
    inputSchema: {
      type: "object",
      properties: {
        chapter_id: {
          type: "string",
          description: "The chapter UUID to analyze.",
        },
        audience_preset: {
          type: "string",
          enum: ["conversational", "formal", "ceremonial"],
          description: "Delivery cadence preset. Defaults to 'formal'.",
        },
        language: {
          type: "string",
          description:
            "Language hint (en, en-US, en-GB, de, es, fr). Empty = let LanguageTool auto-detect.",
        },
        force_refresh: {
          type: "boolean",
          description:
            "Bypass the content-hash cache and recompute from scratch.",
        },
      },
      required: ["chapter_id"],
    },
    handler: (args) => {
      const params = new URLSearchParams();
      if (args.audience_preset) params.set("audience_preset", args.audience_preset);
      if (args.language) params.set("language", args.language);
      if (args.force_refresh) params.set("force_refresh", "1");
      const qs = params.toString();
      const suffix = qs ? `?${qs}` : "";
      return fetchAPI(`/api/chapters/${args.chapter_id}/speech-analysis${suffix}`);
    },
  },
  {
    name: "convert_to_speech",
    description:
      "Flip a book's book_type to 'speech', enable speech_mode on every chapter, and trigger a first speech-analysis pass. Reversible via convert_from_speech. Chapter contents are not modified; only metadata flips.",
    inputSchema: {
      type: "object",
      properties: {
        book_id: { type: "string", description: "The book UUID to convert." },
      },
      required: ["book_id"],
    },
    handler: (args) =>
      postAPI(`/api/books/${args.book_id}/convert-to-speech`, {}),
  },
  {
    name: "convert_from_speech",
    description:
      "Reverse of convert_to_speech. Flips book_type back to the target (default 'story') and clears speech_mode on every chapter. Cached speech metrics on chapter_analysis are preserved as harmless historical data.",
    inputSchema: {
      type: "object",
      properties: {
        book_id: { type: "string", description: "The speech book UUID to revert." },
        target_type: {
          type: "string",
          enum: ["story", "novel", "screenplay", "essay_collection", "poetry_collection"],
          description: "Destination book_type. Defaults to 'story'.",
        },
      },
      required: ["book_id"],
    },
    handler: (args) =>
      postAPI(`/api/books/${args.book_id}/convert-from-speech`, {
        target_type: args.target_type || "story",
      }),
  },
  {
    name: "list_revisions",
    description:
      "List revision history for a chapter, newest first. Each entry includes revision id, author, word count and created_at timestamp. Use fetch_revision to load a specific body and restore_revision to roll a chapter back.",
    inputSchema: {
      type: "object",
      properties: {
        chapter_id: { type: "string", description: "The chapter UUID." },
        limit: {
          type: "number",
          description: "Maximum rows to return (1-200, default 50).",
        },
        offset: {
          type: "number",
          description: "Pagination offset.",
        },
      },
      required: ["chapter_id"],
    },
    handler: (args) => {
      const params = new URLSearchParams();
      if (args.limit) params.set("limit", String(args.limit));
      if (args.offset) params.set("offset", String(args.offset));
      const qs = params.toString();
      const suffix = qs ? `?${qs}` : "";
      return fetchAPI(`/api/chapters/${args.chapter_id}/revisions${suffix}`);
    },
  },
  {
    name: "fetch_revision",
    description:
      "Fetch a single revision's full body (ProseMirror JSON plus plain text) by id.",
    inputSchema: {
      type: "object",
      properties: {
        chapter_id: { type: "string", description: "The chapter UUID." },
        revision_id: { type: "string", description: "The revision UUID." },
      },
      required: ["chapter_id", "revision_id"],
    },
    handler: (args) =>
      fetchAPI(`/api/chapters/${args.chapter_id}/revisions/${args.revision_id}`),
  },
  {
    name: "restore_revision",
    description:
      "Restore a chapter to a previous revision. Snapshots the current body as a new revision first so nothing is lost, then writes the selected revision's body onto the chapter.",
    inputSchema: {
      type: "object",
      properties: {
        chapter_id: { type: "string", description: "The chapter UUID." },
        revision_id: {
          type: "string",
          description: "The revision UUID to restore.",
        },
      },
      required: ["chapter_id", "revision_id"],
    },
    handler: (args) =>
      postAPI(
        `/api/chapters/${args.chapter_id}/revisions/${args.revision_id}/restore`,
        {},
      ),
  },
  {
    name: "list_speaker_notes",
    description:
      "List every speaker note anchored to a chapter, sorted by anchor_start ASC. Speaker notes are anchored margin comments used by speech writers to flag beats, pacing, and stage cues on a specific text range.",
    inputSchema: {
      type: "object",
      properties: {
        chapter_id: { type: "string", description: "The chapter UUID." },
      },
      required: ["chapter_id"],
    },
    handler: (args) => fetchAPI(`/api/chapters/${args.chapter_id}/notes`),
  },
  {
    name: "create_speaker_note",
    description:
      "Create a speaker note on a chapter. The anchor range identifies the exact text span the note is attached to; anchor_text is a short copy of the selection for display.",
    inputSchema: {
      type: "object",
      properties: {
        chapter_id: { type: "string", description: "The chapter UUID." },
        anchor_start: {
          type: "number",
          description: "Character offset where the selection begins.",
        },
        anchor_end: {
          type: "number",
          description: "Character offset where the selection ends.",
        },
        anchor_text: {
          type: "string",
          description: "Short copy of the anchored text (max 200 chars).",
        },
        body: { type: "string", description: "Note body." },
        parent_id: {
          type: "string",
          description: "Optional parent note id for threaded replies.",
        },
      },
      required: ["chapter_id", "body"],
    },
    handler: (args) => {
      const { chapter_id, ...rest } = args;
      return postAPI(`/api/chapters/${chapter_id}/notes`, rest);
    },
  },
];

// ─── Admin / Debug Tools (require CIVNODE_SESSION_TOKEN with admin role) ───

if (sessionToken) {
  tools.push(
    {
      name: "admin_health",
      description: "Check system health: app status, migration version, DB/Redis connectivity, bot status.",
      inputSchema: { type: "object", properties: {} },
      handler: () => fetchAPI("/api/health"),
    },
    {
      name: "admin_stats",
      description: "System-wide statistics: user counts, works, monuments, forums, moderation queue, encounters, and more.",
      inputSchema: { type: "object", properties: {} },
      handler: () => fetchAPI("/api/admin/stats"),
    },
    {
      name: "admin_ai_providers",
      description: "List configured AI text providers (BYOK). Shows provider names, base URLs, models, and which is default. API keys are redacted server-side.",
      inputSchema: { type: "object", properties: {} },
      handler: () => fetchAPI("/api/settings/ai-providers"),
    },
    {
      name: "admin_ai_provider_keys",
      description: "List AI text providers with partial API keys visible (last 4 chars). Use to verify keys are set correctly.",
      inputSchema: { type: "object", properties: {} },
      handler: () => fetchAPI("/api/settings/ai-providers/keys"),
    },
    {
      name: "admin_image_providers",
      description: "List configured image generation providers. Shows names, base URLs, models, and default.",
      inputSchema: { type: "object", properties: {} },
      handler: () => fetchAPI("/api/settings/image-providers"),
    },
    {
      name: "admin_embedding_providers",
      description: "List configured embedding providers (for semantic search). Shows names, base URLs, models, dimensions, and default. IMPORTANT: embedding providers must NOT be used for chat/text generation — they are a separate system.",
      inputSchema: { type: "object", properties: {} },
      handler: () => fetchAPI("/api/settings/embedding-providers"),
    },
    {
      name: "admin_ai_usage",
      description: "Show AI token usage statistics: total tokens, costs, per-model breakdown.",
      inputSchema: { type: "object", properties: {} },
      handler: () => fetchAPI("/api/settings/ai-usage"),
    },
    {
      name: "ai_usage_log",
      description: "Get the detailed AI usage log with filtering and pagination. Returns individual AI calls with provider, model, tokens, cost, and timing.",
      inputSchema: {
        type: "object",
        properties: {
          page: { type: "number", description: "Page number (default: 1)" },
          per_page: { type: "number", description: "Results per page (default: 50)" },
          from: { type: "string", description: "Start date filter (YYYY-MM-DD)" },
          to: { type: "string", description: "End date filter (YYYY-MM-DD)" },
          provider: { type: "string", description: "Filter by provider name" },
          action: { type: "string", description: "Filter by action type" },
          local: { type: "boolean", description: "Filter by local (true) vs cloud (false)" },
          success: { type: "boolean", description: "Filter by success status" },
        },
      },
      handler: (args) => {
        const params = new URLSearchParams();
        if (args.page) params.set("page", args.page);
        if (args.per_page) params.set("per_page", args.per_page);
        if (args.from) params.set("from", args.from);
        if (args.to) params.set("to", args.to);
        if (args.provider) params.set("provider", args.provider);
        if (args.action) params.set("action", args.action);
        if (args.local !== undefined) params.set("local", args.local);
        if (args.success !== undefined) params.set("success", args.success);
        const qs = params.toString();
        return fetchAPI(`/api/settings/ai-usage/log${qs ? "?" + qs : ""}`);
      },
    },
    {
      name: "ai_usage_export",
      description: "Export AI usage data as CSV. Supports the same filters as ai_usage_log (minus pagination). Returns CSV text.",
      inputSchema: {
        type: "object",
        properties: {
          from: { type: "string", description: "Start date filter (YYYY-MM-DD)" },
          to: { type: "string", description: "End date filter (YYYY-MM-DD)" },
          provider: { type: "string", description: "Filter by provider name" },
          action: { type: "string", description: "Filter by action type" },
          local: { type: "boolean", description: "Filter by local (true) vs cloud (false)" },
          success: { type: "boolean", description: "Filter by success status" },
        },
      },
      handler: async (args) => {
        const params = new URLSearchParams();
        if (args.from) params.set("from", args.from);
        if (args.to) params.set("to", args.to);
        if (args.provider) params.set("provider", args.provider);
        if (args.action) params.set("action", args.action);
        if (args.local !== undefined) params.set("local", args.local);
        if (args.success !== undefined) params.set("success", args.success);
        const qs = params.toString();
        const res = await fetch(`${API_BASE}/api/settings/ai-usage/export${qs ? "?" + qs : ""}`, {
          headers: authHeaders(),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`API error: ${res.status} ${res.statusText} ${text}`);
        }
        return { csv: await res.text() };
      },
    },
    {
      name: "ai_pricing_list",
      description: "List AI pricing rules. Shows per-model input/output token prices and image generation prices.",
      inputSchema: { type: "object", properties: {} },
      handler: () => fetchAPI("/api/settings/ai-pricing"),
    },
    {
      name: "ai_pricing_upsert",
      description: "Create or update an AI pricing rule. If a rule for the provider+model combination already exists, it is updated.",
      inputSchema: {
        type: "object",
        properties: {
          provider_name: { type: "string", description: "Provider name (required)" },
          model: { type: "string", description: "Model name (required)" },
          input_price_per_million: { type: "number", description: "Price per million input tokens" },
          output_price_per_million: { type: "number", description: "Price per million output tokens" },
          image_price_per_call: { type: "number", description: "Price per image generation call" },
        },
        required: ["provider_name", "model"],
      },
      handler: (args) => putAPI("/api/settings/ai-pricing", args),
    },
    {
      name: "ai_pricing_delete",
      description: "Delete an AI pricing rule by ID.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Pricing rule UUID (required)" },
        },
        required: ["id"],
      },
      handler: (args) => deleteAPI(`/api/settings/ai-pricing/${args.id}`),
    },
    {
      name: "admin_test_ai_chat",
      description: "Send a test prompt through the AI chat pipeline to verify the text provider works. Uses the default configured AI provider (cloud BYOK). Returns the raw AI response.",
      inputSchema: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "Test prompt to send (default: 'Say hello in one sentence.')" },
          system: { type: "string", description: "Optional system prompt" },
        },
      },
      handler: (args) => postAPI("/api/ai/chat", {
        messages: [
          ...(args.system ? [{ role: "system", content: args.system }] : []),
          { role: "user", content: args.prompt || "Say hello in one sentence." },
        ],
      }),
    },
    {
      name: "admin_test_embedding",
      description: "Test the embedding provider by generating an embedding for a short text. Verifies the embedding pipeline works end-to-end.",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string", description: "Text to embed (default: 'test')" },
        },
      },
      handler: async (args) => {
        const res = await fetch(`${API_BASE}/api/ai/test-embedding`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ text: args.text || "test" }),
        });
        return handleResponse(res);
      },
    },
    {
      name: "admin_users",
      description: "List all users with details: alias, role, status, ban state, patron status, monument, creation date.",
      inputSchema: {
        type: "object",
        properties: {
          page: { type: "number", description: "Page number (default: 1)" },
        },
      },
      handler: (args) => fetchAPI(`/api/admin/users${args.page ? '?page=' + args.page : ''}`),
    },
    {
      name: "admin_user_ban",
      description: "Ban a user by ID. Prevents login and hides their content.",
      inputSchema: {
        type: "object",
        properties: { user_id: { type: "string", description: "User UUID" } },
        required: ["user_id"],
      },
      handler: (args) => postAPI(`/api/admin/users/${args.user_id}/ban`),
    },
    {
      name: "admin_user_unban",
      description: "Unban a previously banned user.",
      inputSchema: {
        type: "object",
        properties: { user_id: { type: "string", description: "User UUID" } },
        required: ["user_id"],
      },
      handler: (args) => postAPI(`/api/admin/users/${args.user_id}/unban`),
    },
    {
      name: "admin_moderation_queue",
      description: "View the content moderation queue: flagged monuments, works, and forum posts awaiting review.",
      inputSchema: { type: "object", properties: {} },
      handler: () => fetchAPI("/api/moderation/queue"),
    },
    {
      name: "admin_backups",
      description: "List available database backups with timestamps and sizes.",
      inputSchema: { type: "object", properties: {} },
      handler: () => fetchAPI("/api/admin/backups"),
    },
    {
      name: "admin_trigger_backup",
      description: "Trigger an immediate database backup.",
      inputSchema: { type: "object", properties: {} },
      handler: () => postAPI("/api/admin/backups"),
    },
    {
      name: "admin_feedback",
      description: "List user feedback and bug reports.",
      inputSchema: { type: "object", properties: {} },
      handler: () => fetchAPI("/api/admin/feedback"),
    },
    {
      name: "admin_site_settings",
      description: "View current site-wide settings: registration open/closed, maintenance mode, feature flags.",
      inputSchema: { type: "object", properties: {} },
      handler: () => fetchAPI("/api/admin/site-settings"),
    },
    {
      name: "admin_update_site_settings",
      description: "Update site-wide settings. Pass only the fields you want to change.",
      inputSchema: {
        type: "object",
        properties: {
          registration_open: { type: "boolean", description: "Allow new registrations" },
          maintenance_mode: { type: "boolean", description: "Enable maintenance mode" },
          side_panel_enabled: { type: "boolean", description: "Enable frontpage side panel" },
          side_panel_title: { type: "string", description: "Side panel title heading" },
          side_panel_body: { type: "string", description: "Side panel body text (markdown)" },
          side_panel_cta_label: { type: "string", description: "Side panel CTA button label (empty = no button)" },
          side_panel_cta_url: { type: "string", description: "Side panel CTA button URL" },
          side_panel_audience: { type: "string", enum: ["visitors", "members", "everyone"], description: "Who sees the side panel" },
        },
      },
      handler: (args) => putAPI("/api/admin/site-settings", args),
    },
    {
      name: "admin_research_stats",
      description: "Research system statistics: total items, embeddings, folders, per-user breakdown.",
      inputSchema: { type: "object", properties: {} },
      handler: () => fetchAPI("/api/admin/research-stats"),
    },
    {
      name: "admin_botsim_state",
      description: "Get bot simulation state: active bots, last tick, simulation status.",
      inputSchema: { type: "object", properties: {} },
      handler: () => fetchAPI("/api/admin/botsim/state"),
    },
    {
      name: "admin_botsim_bots",
      description: "List all simulated bots with their personas, activity stats, and status.",
      inputSchema: { type: "object", properties: {} },
      handler: () => fetchAPI("/api/admin/botsim/bots"),
    },
    {
      name: "admin_botsim_tick",
      description: "Trigger one simulation tick: bots perform random actions (write, post, react).",
      inputSchema: { type: "object", properties: {} },
      handler: () => postAPI("/api/admin/botsim/tick"),
    },
    {
      name: "admin_images",
      description: "List AI-generated images across the platform with moderation status.",
      inputSchema: {
        type: "object",
        properties: {
          page: { type: "number", description: "Page number" },
          status: { type: "string", description: "Filter: 'pending', 'approved', 'blocked'" },
        },
      },
      handler: (args) => {
        const params = new URLSearchParams();
        if (args.page) params.set("page", args.page);
        if (args.status) params.set("status", args.status);
        const qs = params.toString();
        return fetchAPI(`/api/admin/images${qs ? '?' + qs : ''}`);
      },
    },
    {
      name: "admin_block_image",
      description: "Block an AI-generated image (hides it from public view).",
      inputSchema: {
        type: "object",
        properties: {
          entity_type: { type: "string", description: "Entity type: 'character', 'creature', 'location', 'plot'" },
          entity_id: { type: "string", description: "Entity UUID" },
        },
        required: ["entity_type", "entity_id"],
      },
      handler: (args) => postAPI(`/api/admin/images/${args.entity_type}/${args.entity_id}/block`),
    },
    {
      name: "admin_campaigns",
      description: "List marketing campaigns.",
      inputSchema: { type: "object", properties: {} },
      handler: () => fetchAPI("/api/admin/campaigns"),
    },
    {
      name: "admin_ornaments",
      description: "List all monument ornaments (visual decorations granted to users).",
      inputSchema: { type: "object", properties: {} },
      handler: () => fetchAPI("/api/admin/ornaments"),
    },
    {
      name: "admin_captcha_stats",
      description: "Get captcha analytics — challenges, solve rates, country breakdown, and daily trends for the last 30 days.",
      inputSchema: { type: "object", properties: {} },
      handler: () => fetchAPI("/api/admin/captcha/stats"),
    },
    {
      name: "admin_captcha_recent_failures",
      description: "Get recent captcha failures — last 50 failed or expired attempts with IP and country.",
      inputSchema: { type: "object", properties: {} },
      handler: () => fetchAPI("/api/admin/captcha/recent-failures"),
    },
    {
      name: "admin_test_ollama",
      description: "Test Ollama connectivity by sending a chat request. Use to verify Ollama is running and the model works. Timeout is 5 minutes to allow for model loading.",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "Ollama base URL (default: http://localhost:11434)" },
          model: { type: "string", description: "Model to test (default: qwen3:8b)" },
          prompt: { type: "string", description: "Test prompt (default: 'Say hi in 5 words')" },
        },
      },
      handler: async (args) => {
        const url = args.url || "http://localhost:11434";
        const model = args.model || "qwen3:8b";
        const prompt = args.prompt || "Say hi in 5 words";
        try {
          const res = await fetch(`${url}/v1/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: prompt }],
              temperature: 0.7,
            }),
            signal: AbortSignal.timeout(300000),
          });
          if (!res.ok) {
            const body = await res.text().catch(() => "");
            return { ok: false, status: res.status, error: body || res.statusText, url, model };
          }
          const data = await res.json();
          return {
            ok: true,
            model,
            url,
            response: data.choices?.[0]?.message?.content || "(empty)",
            usage: data.usage || null,
          };
        } catch (err) {
          return { ok: false, url, model, error: err.message };
        }
      },
    },
    {
      name: "admin_toggle_strategist",
      description: "Toggle strategist role for a user. Strategists have access to the Civic Room. Admin only.",
      inputSchema: {
        type: "object",
        properties: {
          user_id: { type: "string", description: "User UUID (required)" },
        },
        required: ["user_id"],
      },
      handler: (args) => postAPI(`/api/admin/users/${args.user_id}/toggle-strategist`),
    },

    // ── Civic Room (Admin / Strategist) ──
    {
      name: "civic_room_get_notes",
      description: "Get your private Civic Room notes. Requires strategist or admin role.",
      inputSchema: { type: "object", properties: {} },
      handler: () => fetchAPI("/api/civic-room/notes"),
    },
    {
      name: "civic_room_save_notes",
      description: "Save your private Civic Room notes. Requires strategist or admin role.",
      inputSchema: {
        type: "object",
        properties: {
          body: { type: "string", description: "Notes content (required)" },
        },
        required: ["body"],
      },
      handler: (args) => putAPI("/api/civic-room/notes", { body: args.body }),
    },
    {
      name: "civic_room_overview",
      description: "Get Civic Room overview: recent social posts, threads, canvases. Requires strategist or admin role.",
      inputSchema: { type: "object", properties: {} },
      handler: () => fetchAPI("/api/civic-room/overview"),
    },
    {
      name: "civic_room_threads",
      description: "List civic threads (forum threads with civic visibility). Requires strategist or admin role.",
      inputSchema: { type: "object", properties: {} },
      handler: () => fetchAPI("/api/civic-room/threads"),
    },
    {
      name: "civic_room_canvases",
      description: "List civic canvases. Requires strategist or admin role.",
      inputSchema: { type: "object", properties: {} },
      handler: () => fetchAPI("/api/civic-room/canvases"),
    },
    {
      name: "civic_room_list_channels",
      description: "List social media channels configured for cross-posting. Requires strategist or admin role.",
      inputSchema: { type: "object", properties: {} },
      handler: () => fetchAPI("/api/civic-room/channels"),
    },
    {
      name: "civic_room_create_channel",
      description: "Create a social media channel for cross-posting. Requires strategist or admin role.",
      inputSchema: {
        type: "object",
        properties: {
          platform: { type: "string", description: "Platform name, e.g. twitter, bluesky, mastodon (required)" },
          handle: { type: "string", description: "Account handle on the platform (required)" },
          display_name: { type: "string", description: "Display name for the channel" },
          access_token: { type: "string", description: "OAuth access token" },
          refresh_token: { type: "string", description: "OAuth refresh token" },
        },
        required: ["platform", "handle"],
      },
      handler: (args) => {
        const body = {
          platform: args.platform,
          handle: args.handle,
        };
        if (args.display_name) body.display_name = args.display_name;
        if (args.access_token) body.access_token = args.access_token;
        if (args.refresh_token) body.refresh_token = args.refresh_token;
        return postAPI("/api/civic-room/channels", body);
      },
    },
    {
      name: "civic_room_update_channel",
      description: "Update a social media channel. Pass only fields to change. Requires strategist or admin role.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Channel UUID (required)" },
          platform: { type: "string", description: "Platform name" },
          handle: { type: "string", description: "Account handle" },
          display_name: { type: "string", description: "Display name" },
          access_token: { type: "string", description: "OAuth access token" },
          refresh_token: { type: "string", description: "OAuth refresh token" },
          disabled: { type: "boolean", description: "Whether the channel is disabled" },
        },
        required: ["id"],
      },
      handler: (args) => {
        const { id, ...fields } = args;
        return putAPI(`/api/civic-room/channels/${id}`, fields);
      },
    },
    {
      name: "civic_room_delete_channel",
      description: "Delete a social media channel. Requires strategist or admin role.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Channel UUID (required)" },
        },
        required: ["id"],
      },
      handler: (args) => deleteAPI(`/api/civic-room/channels/${args.id}`),
    },
    {
      name: "civic_room_list_posts",
      description: "List social media posts. Filter by state and channel. Requires strategist or admin role.",
      inputSchema: {
        type: "object",
        properties: {
          state: { type: "string", description: "Filter by state: draft, queued, published, failed" },
          channel_id: { type: "string", description: "Filter by channel UUID" },
        },
      },
      handler: (args) => {
        const params = new URLSearchParams();
        if (args.state) params.set("state", args.state);
        if (args.channel_id) params.set("channel_id", args.channel_id);
        const qs = params.toString();
        return fetchAPI(`/api/civic-room/posts${qs ? "?" + qs : ""}`);
      },
    },
    {
      name: "civic_room_create_post",
      description: "Create a social media post. Can target multiple channels. Requires strategist or admin role.",
      inputSchema: {
        type: "object",
        properties: {
          channel_ids: {
            type: "array",
            items: { type: "string" },
            description: "Channel UUIDs to post to (required)",
          },
          body: { type: "string", description: "Post content (required)" },
          state: { type: "string", description: "Initial state: draft or queued (default: draft)" },
          scheduled_at: { type: "string", description: "Schedule time in RFC3339 format (optional)" },
          repeat_days: { type: "integer", description: "Repeat every N days (optional)" },
        },
        required: ["channel_ids", "body"],
      },
      handler: (args) => {
        const body = {
          channel_ids: args.channel_ids,
          body: args.body,
          state: args.state || "draft",
        };
        if (args.scheduled_at) body.scheduled_at = args.scheduled_at;
        if (args.repeat_days) body.repeat_days = args.repeat_days;
        return postAPI("/api/civic-room/posts", body);
      },
    },
    {
      name: "civic_room_update_post",
      description: "Update a social media post (draft or queued only). Pass only fields to change. Requires strategist or admin role.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Post UUID (required)" },
          body: { type: "string", description: "Post content" },
          state: { type: "string", description: "State: draft or queued" },
          scheduled_at: { type: "string", description: "Schedule time in RFC3339 format" },
          repeat_days: { type: "integer", description: "Repeat every N days" },
        },
        required: ["id"],
      },
      handler: (args) => {
        const { id, ...fields } = args;
        return putAPI(`/api/civic-room/posts/${id}`, fields);
      },
    },
    {
      name: "civic_room_delete_post",
      description: "Delete a social media post (draft or queued only). Requires strategist or admin role.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Post UUID (required)" },
        },
        required: ["id"],
      },
      handler: (args) => deleteAPI(`/api/civic-room/posts/${args.id}`),
    },
    {
      name: "civic_room_publish_post",
      description: "Publish a social media post immediately to its platform. Requires strategist or admin role.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Post UUID (required)" },
        },
        required: ["id"],
      },
      handler: (args) => postAPI(`/api/civic-room/posts/${args.id}/publish`),
    },

    // ── File Manager ──────────────────────────────────────────────────────────
    // NOTE: These three tools are a deliberate exception to the "MCP frozen"
    // rule in MEMORY.md. The file manager launched in Phases 1–7 and the
    // design doc Phase 8 explicitly requires list_drawers, file_stats, and
    // admin_takedown. No other new tools are added.
    {
      name: "list_drawers",
      description: "List all file drawers owned by the authenticated user. Returns drawer name, kind (user|book|work|collection|character|canvas), file count, and total size in bytes.",
      inputSchema: {
        type: "object",
        properties: {},
      },
      handler: () => fetchAPI("/api/drawers"),
    },
    {
      name: "file_stats",
      description: "Get storage quota summary for the authenticated user: quota_bytes, used_bytes, plan (free|paid|grace), grace_until, and upgrade_url. Also returns a human-readable 'X MB of Y MB used' summary.",
      inputSchema: {
        type: "object",
        properties: {},
      },
      handler: async () => {
        const data = await fetchAPI("/api/me/storage");
        const usedMB = ((data.used_bytes || 0) / (1024 * 1024)).toFixed(1);
        const quotaMB = ((data.quota_bytes || 0) / (1024 * 1024)).toFixed(1);
        return { ...data, summary: `${usedMB} MB of ${quotaMB} MB used` };
      },
    },
    {
      name: "volume_library",
      description: "List every volume the authenticated user owns across all puzzle types (sudoku, wordsearch, crossword). Returns rows tagged with puzzle_type and rail. Optionally filter by puzzle_type or rail.",
      inputSchema: {
        type: "object",
        properties: {
          puzzle_type: { type: "string", description: "Filter by puzzle type: sudoku | wordsearch | crossword. Optional." },
          rail: { type: "string", description: "Filter by rail: coffee | classics | code. Optional." },
        },
      },
      handler: (args) => {
        const params = new URLSearchParams();
        if (args.puzzle_type) params.set("puzzle_type", args.puzzle_type);
        if (args.rail) params.set("rail", args.rail);
        const qs = params.toString();
        return fetchAPI(`/api/volumes/library${qs ? `?${qs}` : ""}`);
      },
    },
    {
      name: "volume_unlock",
      description: "Redeem a volume unlock code. Works for both sudoku KDP back-matter codes (four words separated by spaces, dots, or middle-dots) and wordsearch unlock codes (single tokens like ALICE-VOL-2026). The dispatcher figures out which puzzle type the code belongs to and inserts the matching purchase row idempotently.",
      inputSchema: {
        type: "object",
        properties: {
          code: { type: "string", description: "The unlock code as printed in the back matter of the book (required)." },
        },
        required: ["code"],
      },
      handler: (args) => postAPI("/api/volumes/unlock", { code: args.code }),
    },
    {
      name: "admin_takedown",
      description: "Execute a file takedown from a content report. Deletes the file from storage and the database, marks the report as actioned, and optionally bans the file hash to prevent re-upload. Requires admin role.",
      inputSchema: {
        type: "object",
        properties: {
          report_id: { type: "string", description: "Content report UUID (required)" },
          reason: { type: "string", description: "Reason for takedown (required)" },
          ban_hash: { type: "boolean", description: "If true, adds the file SHA-256 to the banned-hash blocklist. Default: false." },
        },
        required: ["report_id", "reason"],
      },
      handler: (args) => postAPI(`/api/admin/content-reports/${args.report_id}/takedown`, {
        reason: args.reason,
        ban_hash: args.ban_hash || false,
      }),
    },
  );
}

// ─── Register Handlers ───

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const tool = tools.find((t) => t.name === name);
  if (!tool) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }
  try {
    const result = await tool.handler(args || {});
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    return { content: [{ type: "text", text: error.message }], isError: true };
  }
});

// ─── Start ───

const transport = new StdioServerTransport();
await server.connect(transport);
