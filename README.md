# Claude Memory MCP Server

MCP server providing semantic memory tools for Claude Code.

## Features

- **Semantic Search**: Vector-based similarity search using LanceDB
- **CRUD Operations**: Create, read, update, delete memories
- **Categorization**: Organize memories by category (preference, fact, decision, workflow, troubleshooting)
- **Tagging**: Flexible tagging system for filtering
- **Importance Scoring**: Prioritize memories in search results

## Installation

```bash
# Clone repository
git clone https://github.com/weizhexiang/a008-claude-memory-mcp-server.git
cd a008-claude-memory-mcp-server

# Install dependencies
npm install

# Build
npm run build
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SILICONFLOW_API_KEY` | SiliconFlow API key (or use `OPENAI_API_KEY`) | Required |
| `EMBEDDING_BASE_URL` | Embedding API base URL | `https://api.siliconflow.cn/v1` |
| `EMBEDDING_MODEL` | Embedding model name | `BAAI/bge-large-zh-v1.5` |
| `EMBEDDING_DIMENSIONS` | Vector dimensions | `1024` |
| `MEMORY_DB_PATH` | Database storage path | `~/.claude/memory-db` |

### Claude Code Configuration

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "memory": {
      "command": "node",
      "args": ["/path/to/a008-claude-memory-mcp-server/dist/index.js"],
      "env": {
        "SILICONFLOW_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `memory_save` | Save a new memory with semantic embedding |
| `memory_search` | Search memories using semantic similarity |
| `memory_list` | List memories with optional filters |
| `memory_get` | Get a specific memory by ID |
| `memory_update` | Update an existing memory |
| `memory_delete` | Delete a memory by ID |
| `memory_stats` | Get database statistics |

## Usage Examples

### Save a Memory

```
User: Remember that I prefer git push with proxy 127.0.0.1:7890

Claude: [calls memory_save]
{
  "content": "User prefers git push with proxy 127.0.0.1:7890",
  "category": "preference",
  "tags": ["git", "proxy"],
  "importance": 8
}
```

### Search Memories

```
User: What did I say about git?

Claude: [calls memory_search]
{
  "query": "git configuration",
  "limit": 5
}
```

## Memory Categories

| Category | Description |
|----------|-------------|
| `preference` | User preferences and settings |
| `fact` | Important facts about projects or workflows |
| `decision` | Technical decisions made |
| `workflow` | Recurring processes or procedures |
| `troubleshooting` | Solutions to problems encountered |

## Architecture

```
Claude Code ←→ MCP Protocol ←→ Memory Server ←→ LanceDB
                                        ↓
                                   SiliconFlow API
                                   (Embeddings)
```

## Cost

Using SiliconFlow embedding API:
- Model: BAAI/bge-large-zh-v1.5
- Cost: ~¥0.0001/1K tokens
- Estimated monthly: <¥1

## License

MIT
