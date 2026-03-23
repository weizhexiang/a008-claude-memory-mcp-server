/**
 * MCP Resources for Claude Memory Server
 *
 * Provides automatic memory context loading at session start
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MemoryDatabase } from "./database.js";

export function registerResources(server: McpServer, database: MemoryDatabase): void {
  // Resource: memory://context - Auto-loaded memory context
  server.resource(
    "memory-context",
    "memory://context",
    {
      description: "Important memories and preferences to remember across sessions",
      mimeType: "text/markdown",
    },
    async (uri: URL) => {
      try {
        // Get high-importance memories
        const memories = await database.list({ limit: 20 });

        // Get stats
        const stats = await database.stats();

        // Format as markdown
        let content = "# 🧠 Memory Context\n\n";
        content += `> Total memories: ${stats.total} | Avg importance: ${stats.avgImportance.toFixed(1)}\n\n`;

        if (memories.length === 0) {
          content += "_No memories stored yet. Use memory_save to add memories._\n";
        } else {
          // Group by category
          const grouped = new Map<string, typeof memories>();
          for (const m of memories) {
            const existing = grouped.get(m.category) || [];
            existing.push(m);
            grouped.set(m.category, existing);
          }

          const categoryEmoji: Record<string, string> = {
            preference: "⚙️",
            fact: "📌",
            decision: "🎯",
            workflow: "🔄",
            troubleshooting: "🔧",
          };

          for (const [category, items] of grouped) {
            const emoji = categoryEmoji[category] || "📝";
            content += `## ${emoji} ${category.charAt(0).toUpperCase() + category.slice(1)}s\n\n`;

            for (const m of items) {
              const importance = "⭐".repeat(Math.min(m.importance, 5));
              content += `- **${importance}** ${m.content}`;
              if (m.tags.length > 0) {
                content += ` _[${m.tags.join(", ")}]_`;
              }
              content += "\n";
            }
            content += "\n";
          }
        }

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/markdown",
              text: content,
            },
          ],
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/markdown",
              text: `# Memory Context Error\n\nFailed to load memories: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  // Resource: memory://preferences - User preferences only
  server.resource(
    "memory-preferences",
    "memory://preferences",
    {
      description: "User preferences and settings",
      mimeType: "application/json",
    },
    async (uri: URL) => {
      try {
        const memories = await database.list({ category: "preference", limit: 50 });
        const preferences = memories.map((m) => ({
          id: m.id,
          content: m.content,
          tags: m.tags,
          importance: m.importance,
        }));

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify(preferences, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
            },
          ],
        };
      }
    }
  );

  // Resource: memory://recent - Recently updated memories
  server.resource(
    "memory-recent",
    "memory://recent",
    {
      description: "Recently added or updated memories",
      mimeType: "application/json",
    },
    async (uri: URL) => {
      try {
        const memories = await database.list({ limit: 10 });

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify(
                memories.map((m) => ({
                  id: m.id,
                  content: m.content,
                  category: m.category,
                  tags: m.tags,
                  importance: m.importance,
                  createdAt: new Date(m.createdAt).toISOString(),
                  updatedAt: new Date(m.updatedAt).toISOString(),
                })),
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
            },
          ],
        };
      }
    }
  );
}
