/**
 * Memory Database
 *
 * Simple in-memory storage for semantic memories (Phase 1 - will add LanceDB later)
 */

import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
import type { Memory, MemoryInput, MemoryUpdate, SearchOptions, ListOptions, MemoryStats, MemoryCategory, MemorySource } from "./types.js";

const DB_FILE = "memories.json";

export class MemoryDatabase {
  private dbPath: string;
  private initialized = false;
  private memories: Map<string, Memory> = new Map();

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  /**
   * Initialize the database
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Ensure directory exists
    await fs.promises.mkdir(this.dbPath, { recursive: true });

    const dbFile = path.join(this.dbPath, DB_FILE);

    // Load existing memories
    if (fs.existsSync(dbFile)) {
      const data = await fs.promises.readFile(dbFile, "utf-8");
      const records = JSON.parse(data);
      for (const record of records) {
        this.memories.set(record.id, record);
      }
    }

    this.initialized = true;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error("Database not initialized. Call initialize() first.");
    }
  }

  /**
   * Save a new memory
   */
  async save(input: MemoryInput): Promise<Memory> {
    this.ensureInitialized();

    const now = Date.now();
    const memory: Memory = {
      id: randomUUID(),
      content: input.content,
      category: input.category,
      tags: input.tags,
      importance: input.importance,
      source: input.source,
      createdAt: now,
      updatedAt: now,
      accessCount: 0,
    };

    this.memories.set(memory.id, memory);
    await this.saveToFile();

    return memory;
  }

  /**
   * Search memories (text-based search)
   */
  async search(query: string, options: SearchOptions = {}): Promise<Memory[]> {
    this.ensureInitialized();

    const limit = options.limit || 5;
    const queryLower = query.toLowerCase();
    let memories = Array.from(this.memories.values());

    // Filter by text match
    memories = memories.filter((m) =>
      m.content.toLowerCase().includes(queryLower) ||
      m.tags.some((t) => t.toLowerCase().includes(queryLower))
    );

    // Filter by category if specified
    if (options.category) {
      memories = memories.filter((m) => m.category === options.category);
    }

    // Filter by tags if specified
    if (options.tags && options.tags.length > 0) {
      memories = memories.filter((m) =>
        options.tags!.some((tag) => m.tags.includes(tag))
      );
    }

    // Sort by importance (descending)
    memories.sort((a, b) => b.importance - a.importance);

    // Limit results
    return memories.slice(0, limit);
  }

  /**
   * List memories with optional filters
   */
  async list(options: ListOptions = {}): Promise<Memory[]> {
    this.ensureInitialized();

    let memories = Array.from(this.memories.values());

    // Filter by category
    if (options.category) {
      memories = memories.filter((m) => m.category === options.category);
    }

    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      memories = memories.filter((m) =>
        options.tags!.some((tag) => m.tags.includes(tag))
      );
    }

    // Filter by date
    if (options.before) {
      const beforeTime = options.before.getTime();
      memories = memories.filter((m) => m.createdAt < beforeTime);
    }
    if (options.after) {
      const afterTime = options.after.getTime();
      memories = memories.filter((m) => m.createdAt > afterTime);
    }

    // Sort by creation date (newest first)
    memories.sort((a, b) => b.createdAt - a.createdAt);

    // Limit results
    return memories.slice(0, options.limit || 10);
  }

  /**
   * Get a single memory by ID
   */
  async get(id: string): Promise<Memory | null> {
    this.ensureInitialized();
    return this.memories.get(id) || null;
  }

  /**
   * Update a memory
   */
  async update(id: string, updates: MemoryUpdate): Promise<Memory> {
    this.ensureInitialized();

    const existing = this.memories.get(id);
    if (!existing) {
      throw new Error(`Memory ${id} not found`);
    }

    // Apply updates
    if (updates.content) existing.content = updates.content;
    if (updates.tags) existing.tags = updates.tags;
    if (updates.importance !== undefined) existing.importance = updates.importance;

    existing.updatedAt = Date.now();
    this.memories.set(id, existing);
    await this.saveToFile();

    return existing;
  }

  /**
   * Delete a memory
   */
  async delete(id: string): Promise<void> {
    this.ensureInitialized();
    const existing = this.memories.get(id);
    if (!existing) {
      throw new Error(`Memory ${id} not found`);
    }
    this.memories.delete(id);
    await this.saveToFile();
  }

  /**
   * Get database statistics
   */
  async stats(): Promise<MemoryStats> {
    this.ensureInitialized();

    const memories = Array.from(this.memories.values());

    const byCategory: Record<MemoryCategory, number> = {
      preference: 0,
      fact: 0,
      decision: 0,
      workflow: 0,
      troubleshooting: 0,
    };

    const bySource: Record<MemorySource, number> = {
      manual: 0,
      conversation: 0,
      import: 0,
    };

    let totalImportance = 0;
    let oldestTimestamp = Infinity;
    let newestTimestamp = 0;
    let oldestId: string | null = null;
    let newestId: string | null = null;

    for (const m of memories) {
      byCategory[m.category]++;
      bySource[m.source]++;
      totalImportance += m.importance;

      if (m.createdAt < oldestTimestamp) {
        oldestTimestamp = m.createdAt;
        oldestId = m.id;
      }
      if (m.createdAt > newestTimestamp) {
        newestTimestamp = m.createdAt;
        newestId = m.id;
      }
    }

    return {
      total: memories.length,
      byCategory,
      bySource,
      avgImportance: memories.length > 0 ? totalImportance / memories.length : 0,
      oldestMemory: oldestId,
      newestMemory: newestId,
    };
  }

  private async saveToFile(): Promise<void> {
    const data = JSON.stringify(Array.from(this.memories.values()), null, 2);
    await fs.promises.writeFile(path.join(this.dbPath, DB_FILE), data, "utf-8");
  }
}
