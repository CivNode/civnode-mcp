#!/usr/bin/env node
/**
 * CivNode MCP Server
 *
 * A Model Context Protocol server that gives AI assistants access to
 * CivNode — a social platform where every human gets exactly one page
 * (Monument) displayed at random. No algorithm, no likes, no followers.
 *
 * 22 tools covering monuments, creative writing, forums, anonymous
 * letters, direct messaging, encounters, groups, and supporter subscriptions.
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
  { name: "civnode", version: "1.0.0" },
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
      "Publish or update your Monument. Each user has exactly one. Subject to a 24-hour edit lock after publishing. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Monument title (max 100 chars)",
        },
        body_markdown: {
          type: "string",
          description: "Monument content in Markdown (max 50000 chars)",
        },
        sources: {
          type: "array",
          items: { type: "string" },
          description: "Optional source URLs",
        },
      },
      required: ["title", "body_markdown"],
    },
    handler: (args) =>
      postAPI("/api/monuments", {
        title: args.title,
        body_markdown: args.body_markdown,
        sources: args.sources || [],
        identity_mode: "alias",
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
      "Send an anonymous letter to a Monument author. Letters are CivNode's way of responding to someone's work — anonymous until the author chooses to reveal. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        monument_id: {
          type: "string",
          description: "UUID of the monument to send the letter to",
        },
        body: {
          type: "string",
          description: "Letter content (max 5000 chars)",
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
      "Browse published creative works on CivNode. Filter by literary form or mood.",
    inputSchema: {
      type: "object",
      properties: {
        form: {
          type: "string",
          description:
            "Filter by form: poem, short_story, essay, novella, serial_chapter, note, other",
        },
        mood: {
          type: "string",
          description: "Filter by mood tag",
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
    description: "Search published creative works by keyword.",
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
      "Publish a creative writing piece. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Work title" },
        body_markdown: {
          type: "string",
          description: "Work content in Markdown",
        },
        form: {
          type: "string",
          description:
            "Literary form: poem, short_story, essay, novella, serial_chapter, note, other",
        },
        mood_tags: {
          type: "array",
          items: { type: "string" },
          description: "1-3 mood tags",
        },
        reach: {
          type: "string",
          description:
            "Visibility: private, friends, limited, open (default: open)",
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
        identity_mode: "alias",
        reach: args.reach || "open",
      }),
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
    description: "Search threads in a user's forum.",
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
      "Get a user's public profile including alias, first words, supporter status, and join date.",
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
      "Send a direct message to another user. Creates a conversation if one doesn't exist. Requires authentication.",
    inputSchema: {
      type: "object",
      properties: {
        conversation_id: {
          type: "string",
          description:
            "Conversation UUID (if known). If not provided, use recipient_alias to start a new conversation.",
        },
        recipient_alias: {
          type: "string",
          description:
            "Alias of the recipient (for starting a new conversation)",
        },
        content: { type: "string", description: "Message content" },
      },
      required: ["content"],
    },
    handler: (args) => {
      if (args.conversation_id) {
        return postAPI(
          `/api/messages/conversations/${args.conversation_id}/messages`,
          { content: args.content }
        );
      }
      // Create a new conversation with the recipient.
      return postAPI("/api/messages/conversations", {
        type: "direct",
        alias: args.recipient_alias,
        message: args.content,
      });
    },
  },
  {
    name: "list_conversations",
    description:
      "List your conversations with latest messages. Requires authentication.",
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
];

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
