/**
 * Type definitions for Claude Memory MCP Server
 */

export type MemoryCategory = "preference" | "fact" | "decision" | "workflow" | "troubleshooting";

export type MemorySource = "manual" | "conversation" | "import";

export interface Memory {
  id: string;
  content: string;
  category: MemoryCategory;
  tags: string[];
  importance: number; // 1-10
  source: MemorySource;
  createdAt: number;
  updatedAt: number;
  accessCount: number;
}

export interface MemoryInput {
  content: string;
  category: MemoryCategory;
  tags: string[];
  importance: number;
  source: MemorySource;
}

export interface MemoryUpdate {
  content?: string;
  tags?: string[];
  importance?: number;
}

export interface SearchOptions {
  limit?: number;
  category?: MemoryCategory;
  tags?: string[];
}

export interface ListOptions {
  limit?: number;
  category?: MemoryCategory;
  tags?: string[];
  before?: Date;
  after?: Date;
}

export interface MemoryStats {
  total: number;
  byCategory: Record<MemoryCategory, number>;
  bySource: Record<MemorySource, number>;
  avgImportance: number;
  oldestMemory: string | null;
  newestMemory: string | null;
}
