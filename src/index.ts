#!/usr/bin/env node
/**
 * Claude Memory MCP Server
 *
 * MCP server providing semantic memory tools for Claude Code.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as path from "path";
import * as os from "os";
import { EmbeddingService } from "./embedding.js";
import { MemoryDatabase } from "./database.js";
import { registerTools } from "./tools.js";
import type { MemoryCategory } from "./types.js";

// Configuration
const CONFIG = {
  embedding: {
    apiKey: process.env.SILICONFLOW_API_KEY || process.env.OPENAI_API_KEY || "",
    baseUrl: process.env.EMBEDDING_BASE_URL || "https://api.siliconflow.cn/v1",
    model: process.env.EMBEDDING_MODEL || "BAAI/bge-large-zh-v1.5",
    dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || "1024"),
  },
  database: {
    path: process.env.MEMORY_DB_PATH || path.join(os.homedir(), ".claude", "memory-db"),
  },
};

// Validate configuration
if (!CONFIG.embedding.apiKey) {
  console.error("Error: SILICONFLOW_API_KEY or OPENAI_API_KEY environment variable is required");
  process.exit(1);
}

// Initialize services
const embeddingService = new EmbeddingService(
  CONFIG.embedding.apiKey,
  CONFIG.embedding.baseUrl,
  CONFIG.embedding.model
);

const database = new MemoryDatabase(CONFIG.database.path);

// Create MCP server
const server = new McpServer({
  name: "claude-memory-server",
  version: "1.0.0",
});

// Register tools
registerTools(server, embeddingService, database);

// ============================================================================
// Start server
// ============================================================================

async function main() {
  // Initialize database
  await database.initialize();

  // Start MCP server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("Claude Memory MCP Server started");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
