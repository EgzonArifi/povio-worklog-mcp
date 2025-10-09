# Povio Worklog MCP Server

A Model Context Protocol (MCP) server that provides worklog generation from git commits and integration with Povio dashboard.

## Features

- 🔍 **Generate Worklog**: Automatically analyze git commits and generate professional worklog descriptions
- 🤖 **AI Enhancement (Default)**: AI automatically generates optimized, guideline-compliant descriptions from your commits
- 📤 **Post to Povio**: Post worklogs directly to Povio dashboard
- ⚡ **Combined Action**: Generate and post in one step
- 🎫 **Smart Parsing**: Automatically extracts ticket numbers (e.g., ENG-155, WAY-204)
- 📊 **Professional Formatting**: Creates client-appropriate worklog descriptions

## Installation

> **Note:** These steps are only needed once during initial setup, or after you make changes to the source code.

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Server

```bash
npm run build
```

This creates the compiled JavaScript in the `dist/` directory.

**When to rebuild:**
- ✅ First time setup
- ✅ After pulling updates from git
- ✅ After making changes to `src/` files
- ❌ Not needed for regular daily use

## Cursor Configuration

Add the MCP server to your Cursor settings:

**File:** `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "worklog": {
      "command": "node",
      "args": ["/absolute/path/to/povio-worklog-mcp/dist/index.js"],
      "env": {
        "POVIO_API_TOKEN": "your-povio-cookie-token",
        "DEFAULT_PROJECT_ID": "15886"
      }
    }
  }
}
```

**Configuration Details:**
- **Path:** Replace with your actual absolute path to the server
- **POVIO_API_TOKEN:** Your Povio dashboard cookie (required)
- **DEFAULT_PROJECT_ID:** Your default project ID (optional - if set, you don't need to specify projectId when posting worklogs)

### Restart Cursor

After adding the configuration, restart Cursor to load the MCP server.

## Usage in Cursor

Once configured, you can use natural language to interact with the worklog tools:

### Generate Worklog (AI-Enhanced by Default)

```
You: "generate worklog for today"
AI: [Uses generate_worklog tool with AI enhancement]
    Analyzes commits and generates optimized description following Povio guidelines
    Returns: Enhanced, client-appropriate worklog description
```

### Generate without AI Enhancement (Not Recommended)

```
You: "generate worklog for today without AI"
AI: [Uses generate_worklog tool with enhanceWithAI=false]
    Returns: Basic auto-generated description
```

### Post Worklog

```
You: "post worklog with 4 hours to project 15886"
AI: [Uses post_worklog tool]
    Posts to Povio dashboard

You: "post worklog with 3 hours"
AI: [Uses post_worklog tool with DEFAULT_PROJECT_ID]
    Posts to your default project
```

### Generate and Post

```
You: "generate and post worklog for today, 4 hours"
AI: [Uses generate_and_post_worklog tool]
    Generates from commits AND posts to Povio (uses DEFAULT_PROJECT_ID)

You: "generate and post worklog for yesterday, 6 hours, project 12345"
AI: [Uses generate_and_post_worklog tool]
    Generates and posts to specific project
```

## Available Tools

### 1. `generate_worklog`

Generate a worklog from git commits.

**Parameters:**
- `timeframe` (required): `"today"` or `"yesterday"`
- `repository` (optional): Path to git repository (defaults to current directory)
- `enhanceWithAI` (optional): Defaults to `true`. Set to `false` to disable AI enhancement (not recommended)

**Returns (AI enhancement mode - default):**
The tool returns:
- Detailed commit information with context
- Povio guidelines for the AI to follow
- A prompt requesting the AI to generate an optimized description
- Auto-generated description as a reference

The AI will then analyze the commits and create a superior, client-appropriate worklog description.

**Returns (basic mode - when disabled):**
```json
{
  "date": "2025-10-09",
  "description": "[ENG-155] Implement Screenshot Upload Feature",
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
- `projectId` (optional): Povio project ID (e.g., 15886). Uses DEFAULT_PROJECT_ID from environment if not provided
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
- `projectId` (optional): Povio project ID. Uses DEFAULT_PROJECT_ID from environment if not provided
- `hours` (required): Number of hours worked
- `repository` (optional): Path to git repository
- `enhanceWithAI` (optional): Defaults to `true`. Set to `false` to disable AI enhancement and auto-post (not recommended)

**Returns:**
Combined summary with generation and posting results.

**Note:** By default (AI enhancement enabled), the tool will:
1. Generate the worklog with AI enhancement prompt
2. Wait for AI to create optimized description
3. NOT post automatically (you'll need to use `post_worklog` with the AI-generated description)

## AI-Enhanced Worklog Generation (Default!)

All worklog generation now uses **AI enhancement by default**. This feature:

### How It Works

1. **Analyze Commits**: The tool extracts your git commits with full context
2. **Apply Guidelines**: Provides the AI with Povio's specific guidelines
3. **Generate Description**: The AI creates an optimized, client-appropriate description
4. **Review & Post**: You review the AI-generated description and post it

### Benefits

- 🎯 **Better Context**: AI understands the bigger picture from multiple commits
- 📝 **Improved Language**: Generates more professional, client-facing descriptions
- ✅ **Guideline Compliance**: Automatically follows Povio's invoicing guidelines
- ⚡ **Time Saving**: No need to manually craft descriptions

### Example

**Your commits:**
```
8e644dc - ENG-155 Implement Screenshot Upload Feature
a2b3c4d - ENG-155 Add error handling for uploads
d5e6f7g - ENG-155 Update UI for better UX
```

**Standard description:**
```
[ENG-155] Implement Screenshot Upload Feature
```

**AI-enhanced description:**
```
[ENG-155] Implemented screenshot upload functionality in developer settings with comprehensive error handling and improved user interface for enhanced user experience
```

### Usage

AI enhancement is **automatic** - just use the normal commands:
```
You: "generate worklog for today"
```

To disable AI enhancement (not recommended), you can explicitly set `enhanceWithAI: false` when calling the tool directly, or say "without AI".

## Important: Client-Facing Descriptions

**This tool generates descriptions that appear on client invoices.** The formatter:

- ✅ Filters commits to **only YOUR commits** (based on git user.email)
- ✅ Creates professional, client-appropriate descriptions
- ✅ Removes technical jargon (branch names, PR numbers, etc.)
- ✅ Extracts and includes ticket numbers
- ✅ Combines multiple commits into dense, descriptive format

**Povio Guidelines:**
> Logs are shown on invoices for clients exactly as they are, so make sure they are appropriate and descriptive. Write down what you accomplished for the client in a dense format and add ticket numbers or descriptions if possible.

The tool automatically formats your commits to follow these guidelines. With **AI enhancement mode**, you get even better descriptions that maximize clarity and professionalism.

## Getting Your Povio API Token

1. Log in to Povio Dashboard
2. Open browser DevTools (F12)
3. Go to Application → Cookies
4. Find the `_poviolabs_dashboard` cookie
5. Copy its value (the entire string)
6. Add it to your Cursor MCP configuration

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

## Troubleshooting

### Server Not Starting

1. Check that the server was built:
   ```bash
   ls -la dist/index.js
   ```

2. Test the server manually:
   ```bash
   node dist/index.js
   ```
   (It should run without errors and wait for input)

3. Check Cursor logs for MCP errors

### Authentication Errors

If posting to Povio fails:

1. Verify your token is set in the Cursor MCP configuration
2. Check token validity (it may have expired)
3. Get a fresh token from the Povio dashboard

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

## Architecture

This MCP server is built with TypeScript and follows the Model Context Protocol specification. It provides structured tools that AI assistants like Claude can use to help with worklog management.

**Key Components:**
- `src/services/git.ts` - Git commit analysis
- `src/services/povio.ts` - Povio API integration
- `src/services/formatter.ts` - Worklog formatting
- `src/tools/` - MCP tool definitions

## License

MIT
