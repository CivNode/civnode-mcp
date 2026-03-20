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
 * 228 tools covering:
 * - Creative writing: works CRUD, series, AI feedback, title/summary suggestions
 * - World-building: characters, locations, creatures, plots, family trees (full CRUD + AI)
 * - Books: chapters, entity linking, cover generation, export
 * - Research & Observatory: semantic search, chapter analysis, writing insights
 * - Marketplace: browse, discover, and fork community creations
 * - Community: monuments, forums, letters, encounters, competitions, topics
 * - Collaboration: real-time co-writing, canvases, draft sharing, workshops
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
  { name: "civnode", version: "2.2.0" },
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
      "Get a preview of the text that will be shared when posting your Monument to social media. Requires authentication.",
    inputSchema: { type: "object", properties: {} },
    handler: () => fetchAPI("/api/monument/share/preview"),
  },
  {
    name: "monument_share",
    description:
      "Share your Monument to connected social media platforms (Bluesky, Mastodon). Requires authentication and at least one connected social account.",
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
        reach: {
          type: "string",
          description:
            "Visibility: private, limited, open (default: open)",
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
        reach: args.reach || "open",
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

  // ─── Workshop Tools ───

  {
    name: "list_workshops",
    description: "List writing workshops for a group.",
    inputSchema: {
      type: "object",
      properties: {
        group_id: { type: "string", description: "UUID of the group" },
      },
      required: ["group_id"],
    },
    handler: (args) => fetchAPI(`/api/groups/${args.group_id}/workshops`),
  },
  {
    name: "create_workshop",
    description: "Submit a work for group critique in a writing workshop.",
    inputSchema: {
      type: "object",
      properties: {
        group_id: { type: "string", description: "UUID of the group" },
        work_id: { type: "string", description: "UUID of the work to submit" },
        title: { type: "string", description: "Workshop title" },
        description: {
          type: "string",
          description: "What feedback you are looking for (optional)",
        },
      },
      required: ["group_id", "work_id", "title"],
    },
    handler: (args) =>
      postAPI(`/api/groups/${args.group_id}/workshops`, {
        work_id: args.work_id,
        title: args.title,
        description: args.description || "",
      }),
  },
  {
    name: "get_workshop",
    description: "Get workshop details including reviews.",
    inputSchema: {
      type: "object",
      properties: {
        workshop_id: { type: "string", description: "UUID of the workshop" },
      },
      required: ["workshop_id"],
    },
    handler: (args) => fetchAPI(`/api/workshops/${args.workshop_id}`),
  },
  {
    name: "submit_workshop_review",
    description:
      "Submit a structured review for a workshop. Includes overall feedback and optional ratings.",
    inputSchema: {
      type: "object",
      properties: {
        workshop_id: { type: "string", description: "UUID of the workshop" },
        overall: {
          type: "string",
          description: "Overall feedback text (required)",
        },
        clarity: {
          type: "integer",
          description: "Clarity rating 1-5 (optional)",
        },
        pacing: {
          type: "integer",
          description: "Pacing rating 1-5 (optional)",
        },
        voice: {
          type: "integer",
          description: "Voice rating 1-5 (optional)",
        },
        engagement: {
          type: "integer",
          description: "Engagement rating 1-5 (optional)",
        },
      },
      required: ["workshop_id", "overall"],
    },
    handler: (args) => {
      const body = { overall: args.overall };
      if (args.clarity) body.clarity = args.clarity;
      if (args.pacing) body.pacing = args.pacing;
      if (args.voice) body.voice = args.voice;
      if (args.engagement) body.engagement = args.engagement;
      return postAPI(`/api/workshops/${args.workshop_id}/reviews`, body);
    },
  },

  // ─── AI Writing Tools ───

  {
    name: "ai_writing_feedback",
    description:
      "Get AI-generated constructive feedback on a work's clarity, pacing, voice, and engagement. Only works on your own writing.",
    inputSchema: {
      type: "object",
      properties: {
        work_id: { type: "string", description: "UUID of the work" },
      },
      required: ["work_id"],
    },
    handler: (args) => postAPI(`/api/writing/${args.work_id}/ai-feedback`, {}),
  },
  {
    name: "ai_title_summary_suggest",
    description:
      "Get AI-suggested titles and summaries for a work. Only works on your own writing.",
    inputSchema: {
      type: "object",
      properties: {
        work_id: { type: "string", description: "UUID of the work" },
      },
      required: ["work_id"],
    },
    handler: (args) => postAPI(`/api/writing/${args.work_id}/ai-suggest`, {}),
  },

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
      "Update a writing work's content, title, mood tags, or visibility. Requires authentication.",
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
        reach: {
          type: "string",
          description: "Visibility: private, limited, open",
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
      if (args.reach) body.reach = args.reach;
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
          description: "Type: novel, novella, short_story_collection, poetry_collection, anthology, screenplay, other (required)",
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
    description: "Create a new chapter in a book. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        book_id: { type: "string", description: "Book UUID" },
        title: { type: "string", description: "Chapter title (required)" },
        chapter_type: {
          type: "string",
          description: "Type: chapter, prologue, epilogue, interlude, appendix (required)",
        },
      },
      required: ["book_id", "title", "chapter_type"],
    },
    handler: (args) =>
      postAPI(`/api/books/${args.book_id}/chapters`, {
        title: args.title,
        chapter_type: args.chapter_type,
      }),
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
      "Analyze a chapter for characters, themes, plot points, and relationships. Requires authentication and an AI provider.",
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
