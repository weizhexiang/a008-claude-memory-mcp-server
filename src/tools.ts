/**
 * MCP Tools for Claude Memory Server
 */

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { EmbeddingService } from "./embedding.js";
import { MemoryDatabase } from "./database.js";
import type { MemoryCategory } from "./types.js";

const CATEGORIES = ["preference", "fact", "decision", "workflow", "troubleshooting"] as const;

export function registerTools(
  server: McpServer,
  embeddingService: EmbeddingService,
  database: MemoryDatabase
): void {
  // Tool: memory_save
  server.tool(
    "memory_save",
    "Save a new memory for future retrieval",
    {
      content: z.string().min(1).describe("The memory content to save"),
      category: z
        .enum(["preference", "fact", "decision", "workflow", "troubleshooting"])
        .describe("Category of the memory"),
      tags: z.array(z.string()).optional().default([]).describe("Tags for filtering"),
      importance: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .default(5)
        .describe("Importance score (1-10, higher = more important)"),
    },
    async ({ content, category, tags, importance }) => {
      try {
        const memory = await database.save({
          content,
          category: category as MemoryCategory,
          tags: tags || [],
          importance: importance || 5,
          source: "manual",
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  id: memory.id,
                  message: "Memory saved successfully",
                  category,
                  tags: tags || [],
                  importance: importance || 5,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: error instanceof Error ? error.message : "Unknown error",
                },
                null,
                2
              ),
            },
          ],
        };
      }
    }
  );

  // Tool: memory_search
  server.tool(
    "memory_search",
    "Search memories using semantic similarity",
    {
      query: z.string().min(1).describe("Search query"),
      limit: z.number().min(1).max(50).optional().default(5).describe("Maximum results"),
      category: z
        .enum(["preference", "fact", "decision", "workflow", "troubleshooting"])
        .optional()
        .describe("Filter by category"),
    },
    async ({ query, limit, category }) => {
      try {
        const results = await database.search(query, {
          limit,
          category: category as MemoryCategory | undefined,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  query,
                  count: results.length,
                  results: results.map((r) => ({
                    id: r.id,
                    content: r.content,
                    category: r.category,
                    tags: r.tags,
                    importance: r.importance,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: error instanceof Error ? error.message : "Unknown error",
                },
                null,
                2
              ),
            },
          ],
        };
      }
    }
  );

  // Tool: memory_list
  server.tool(
    "memory_list",
    "List memories with optional filters",
    {
      category: z
        .enum(["preference", "fact", "decision", "workflow", "troubleshooting"])
        .optional()
        .describe("Filter by category"),
      limit: z.number().min(1).max(100).optional().default(10).describe("Maximum results"),
      tags: z.array(z.string()).optional().describe("Filter by tags"),
    },
    async ({ category, limit, tags }) => {
      try {
        const memories = await database.list({
          category: category as MemoryCategory | undefined,
          limit,
          tags,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  count: memories.length,
                  memories: memories.map((m) => ({
                    id: m.id,
                    content: m.content,
                    category: m.category,
                    tags: m.tags,
                    importance: m.importance,
                    createdAt: new Date(m.createdAt).toISOString(),
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: error instanceof Error ? error.message : "Unknown error",
                },
                null,
                2
              ),
            },
          ],
        };
      }
    }
  );

  // Tool: memory_get
  server.tool(
    "memory_get",
    "Get a specific memory by ID",
    {
      id: z.string().describe("Memory ID"),
    },
    async ({ id }) => {
      try {
        const memory = await database.get(id);

        if (!memory) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    success: false,
                    error: "Memory not found",
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  memory: {
                    id: memory.id,
                    content: memory.content,
                    category: memory.category,
                    tags: memory.tags,
                    importance: memory.importance,
                    source: memory.source,
                    createdAt: new Date(memory.createdAt).toISOString(),
                    updatedAt: new Date(memory.updatedAt).toISOString(),
                    accessCount: memory.accessCount,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: error instanceof Error ? error.message : "Unknown error",
                },
                null,
                2
              ),
            },
          ],
        };
      }
    }
  );

  // Tool: memory_update
  server.tool(
    "memory_update",
    "Update an existing memory",
    {
      id: z.string().describe("Memory ID to update"),
      content: z.string().optional().describe("New content"),
      tags: z.array(z.string()).optional().describe("New tags"),
      importance: z.number().min(1).max(10).optional().describe("New importance"),
    },
    async ({ id, content, tags, importance }) => {
      try {
        const existing = await database.get(id);
        if (!existing) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    success: false,
                    error: "Memory not found",
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        const updated = await database.update(id, {
          content,
          tags,
          importance,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  id: updated.id,
                  message: "Memory updated successfully",
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: error instanceof Error ? error.message : "Unknown error",
                },
                null,
                2
              ),
            },
          ],
        };
      }
    }
  );

  // Tool: memory_delete
  server.tool(
    "memory_delete",
    "Delete a memory by ID",
    {
      id: z.string().describe("Memory ID to delete"),
    },
    async ({ id }) => {
      try {
        const existing = await database.get(id);
        if (!existing) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    success: false,
                    error: "Memory not found",
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        await database.delete(id);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  id,
                  message: "Memory deleted successfully",
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: error instanceof Error ? error.message : "Unknown error",
                },
                null,
                2
              ),
            },
          ],
        };
      }
    }
  );

  // Tool: memory_stats
  server.tool(
    "memory_stats",
    "Get statistics about stored memories",
    {},
    async () => {
      try {
        const stats = await database.stats();

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  stats,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: false,
                  error: error instanceof Error ? error.message : "Unknown error",
                },
                null,
                2
              ),
            },
          ],
        };
      }
    }
  );
}
