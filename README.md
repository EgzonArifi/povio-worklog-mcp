# Worklog MCP Server

A Model Context Protocol (MCP) server that provides worklog generation from git commits and integration with Povio dashboard.

## Features

- 🔍 **Generate Worklog**: Automatically analyze git commits and generate professional worklog descriptions
- 📤 **Post to Povio**: Post worklogs directly to Povio dashboard
- ⚡ **Combined Action**: Generate and post in one step
- 🎫 **Smart Parsing**: Automatically extracts ticket numbers (e.g., ENG-155, WAY-204)
- 📊 **Professional Formatting**: Creates client-appropriate worklog descriptions

## Installation

### 1. Install Dependencies

```bash
cd mcp-server
npm install
```

### 2. Build the Server

```bash
npm run build
```

This creates the compiled JavaScript in the `dist/` directory.

### 3. Configure Environment

Set your Povio API token as an environment variable:

```bash
export POVIO_API_TOKEN="your-povio-cookie-token"
```

Or add it to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
echo 'export POVIO_API_TOKEN="your-token"' >> ~/.zshrc
source ~/.zshrc
```

## Cursor Configuration

Add the MCP server to your Cursor settings:

**File:** `~/.cursor/mcp_settings.json` (or via Cursor Settings UI)

```json
{
  "mcpServers": {
    "worklog": {
      "command": "node",
      "args": ["/Users/egzonarifi/Documents/GitHub/Aurascan/mcp-server/dist/index.js"],
      "env": {
        "POVIO_API_TOKEN": "your-povio-cookie-token",
        "DEFAULT_PROJECT_ID": "15886"
      }
    }
  }
}
```

**Important:** Replace the path with your actual absolute path to the server.

### Restart Cursor

After adding the configuration, restart Cursor to load the MCP server.

## Usage in Cursor

Once configured, you can use natural language to interact with the worklog tools:

### Generate Worklog

```
You: "generate worklog for today"
AI: [Uses generate_worklog tool]
    Returns: Date, description, commits analyzed, ticket numbers
```

### Post Worklog

```
You: "post worklog with 4 hours to project 15886"
AI: [Uses post_worklog tool]
    Posts to Povio dashboard
```

### Generate and Post

```
You: "generate and post worklog for today, log 4 hours"
AI: [Uses generate_and_post_worklog tool]
    Generates from commits AND posts to Povio
```

## Available Tools

### 1. `generate_worklog`

Generate a worklog from git commits.

**Parameters:**
- `timeframe` (required): `"today"` or `"yesterday"`
- `repository` (optional): Path to git repository (defaults to current directory)

**Returns:**
```json
{
  "date": "2025-10-09",
  "description": "[ENG-155] Implemented screenshot upload feature",
  "commits": [
    "8e644dc - ENG-155 Implement Screenshot Upload Feature"
  ],
  "ticketNumbers": ["ENG-155"]
}
```

### 2. `post_worklog`

Post a worklog entry to Povio dashboard.

**Parameters:**
- `description` (required): Worklog description
- `projectId` (required): Povio project ID (e.g., 15886)
- `hours` (required): Number of hours worked
- `date` (required): Date in YYYY-MM-DD format

**Returns:**
```
✓ Worklog posted successfully!
Date: 2025-10-09
Hours: 4
Project ID: 15886
```

### 3. `generate_and_post_worklog`

Combined tool that generates from commits and posts to Povio.

**Parameters:**
- `timeframe` (required): `"today"` or `"yesterday"`
- `projectId` (required): Povio project ID
- `hours` (required): Number of hours worked
- `repository` (optional): Path to git repository

**Returns:**
Combined summary with generation and posting results.

## Project IDs

Common Povio project IDs:
- **15886** - FaceFlip/Aurascan
- Add more as needed...

## Development

### Watch Mode

For development with auto-rebuild:

```bash
npm run dev
```

### Clean Build

```bash
npm run clean
npm run build
```

### Manual Testing

You can test the server manually by running:

```bash
node dist/index.js
```

Then send JSON-RPC messages via stdin.

## Comparison with Shell Scripts

### Current Shell Script Approach
- ✅ Works without Node.js setup
- ✅ Direct shell execution
- ❌ Raw text output (requires parsing)
- ❌ No structured data
- ❌ Separate process each time

### MCP Server Approach
- ✅ Structured JSON responses
- ✅ Type-safe with TypeScript
- ✅ Persistent process (faster)
- ✅ Better error handling
- ✅ Works across all repos
- ❌ Requires Node.js and build step
- ❌ More complex setup

## Troubleshooting

### Server Not Starting

1. Check that Cursor can find the server:
   ```bash
   ls -la /Users/egzonarifi/Documents/GitHub/Aurascan/mcp-server/dist/index.js
   ```

2. Test the server manually:
   ```bash
   node /Users/egzonarifi/Documents/GitHub/Aurascan/mcp-server/dist/index.js
   ```
   (It should run without errors and wait for input)

3. Check Cursor logs for MCP errors

### Authentication Errors

If posting to Povio fails:

1. Verify your token is set:
   ```bash
   echo $POVIO_API_TOKEN
   ```

2. Check token validity by running your existing shell script

3. Make sure the token is in the Cursor configuration

### No Commits Found

If worklog generation returns no commits:

1. Verify you're in a git repository:
   ```bash
   git status
   ```

2. Check if you have commits today:
   ```bash
   git log --since="today" --oneline
   ```

3. The server uses `--all` flag to check all branches

## License

MIT




