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
 * 56 tools covering:
 * - Creative writing: publish works, get AI feedback, title/summary suggestions
 * - World-building: characters, locations, creatures, plots, family trees
 * - Community: monuments, forums, anonymous letters, encounters, competitions
 * - Collaboration: real-time co-writing, draft sharing, workshops
 * - Platform: messaging, groups, notifications, bookmarks, subscriptions
 *
 * Usage:
 *   npx civnode-mcp
 *
 * Claude Desktop config (~/.config/claude/claude_desktop_config.json):
 *   {
 *     "mcpServers": {
 *       "civnode": {
 *         "command": "npx",
 *         "args": ["-y", "civnode-mcp"],
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
  { name: "civnode", version: "1.1.0" },
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
      name: "admin_test_ollama",
      description: "Test local Ollama connectivity from the SERVER side. Sends a simple chat request to the Ollama instance configured in the embedding provider's base URL (minus /v1). Use to verify Ollama is reachable from Docker.",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "Ollama base URL (default: http://host.docker.internal:11434)" },
          model: { type: "string", description: "Model to test (default: qwen3:8b)" },
          prompt: { type: "string", description: "Test prompt (default: 'Say hi in 5 words')" },
        },
      },
      handler: async (args) => {
        const url = args.url || "http://host.docker.internal:11434";
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
            signal: AbortSignal.timeout(30000),
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
