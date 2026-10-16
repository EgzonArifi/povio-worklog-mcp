<p align="center">
<div align="center">
  <img src="resources/povio-mcp-server.png" width="50%" alt="Povio Worklog MCP Server" />
</div>
</p>
<div align="center">

[![npm version](https://badge.fury.io/js/povio-worklog-mcp.svg)](https://www.npmjs.com/package/povio-worklog-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

</div>

# Povio Worklog MCP Server

A Model Context Protocol (MCP) server that provides automated worklog generation from git commits with AI enhancement and seamless Povio dashboard integration.

**Transform this:**
```bash
git log  # Copy commits manually
# Open Povio dashboard
# Fill in project, hours, description
# Submit
```

**Into this:**
```
wl FaceFlip 8  # Done! ✓
```

## Features

- 📋 **List Projects**: Easily view all your active Povio projects
- 🏷️ **Use Project Names**: Simply use project names like "FaceFlip" or "Autobiography"
- 🔍 **Generate Worklog**: Automatically analyze git commits and generate professional worklog descriptions
- 📅 **Flexible Dates**: Support for "today", "yesterday", and specific dates (e.g., "2024-10-28", "Oct 28, 2024")
- 🤖 **AI Enhancement (Default)**: AI automatically generates optimized, guideline-compliant descriptions from your commits
- 📤 **Post to Povio**: Post worklogs directly to Povio dashboard
- ⚡ **Combined Action**: Generate and post in one step
- 🎫 **Smart Parsing**: Automatically extracts ticket numbers (e.g., ENG-155, WAY-204)
- 📊 **Professional Formatting**: Creates client-appropriate worklog descriptions

## Installation

### Quick Start (Recommended - npm)

No need to clone! Just add the configuration to Cursor:

**File:** `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "povio-worklog": {
      "command": "npx",
      "args": ["-y", "povio-worklog-mcp"],
      "env": {
        "POVIO_API_TOKEN": "your-povio-token-value"
      }
    }
  }
}
```

**That's it!** The package will be automatically downloaded and run via npx.

**Configuration Details:**
- **POVIO_API_TOKEN:** Your Povio dashboard cookie token value (see [Getting Your Token](#getting-your-povio-api-token) below for detailed instructions)
  - Just provide the token value - the `_poviolabs_dashboard=` prefix is automatically added
- **Note:** The tool uses the current working directory of your Cursor workspace as the git repository
- **Updates:** npx automatically uses the latest version on each run

### Alternative: Local Development Installation

If you want to contribute or modify the source code:

#### 1. Clone the Repository

```bash
git clone https://github.com/EgzonArifi/povio-worklog-mcp.git
cd mcp-server
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Build the Server

```bash
npm run build
```

#### 4. Configure Cursor

**File:** `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "povio-worklog": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/dist/index.js"],
      "env": {
        "POVIO_API_TOKEN": "your-povio-token-value"
      }
    }
  }
}
```

**When to rebuild:**
- ✅ First time setup
- ✅ After pulling updates from git
- ✅ After making changes to `src/` files

### Restart Cursor

After adding the configuration, **fully restart Cursor** (Cmd+Q and reopen, not just close the window) to load the MCP server.

> **⚠️ Getting "command not found" error?** See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for quick fixes. Most common solution: `npm cache clean --force` and restart Cursor.

## Usage in Cursor

Once configured, you can use natural language to interact with the worklog tools:

### Quick Commands

For faster workflow, use these short patterns:

```
wl                          → Generate worklog for today
wl yesterday                → Generate worklog for yesterday
wl 2024-10-28               → Generate worklog for specific date (Oct 28)
wl list                     → List Povio projects
wl post FaceFlip 8          → Generate and post to FaceFlip, 8 hours
wl FaceFlip 4               → Generate and post to FaceFlip, 4 hours
wl yesterday FaceFlip 8     → Generate yesterday's worklog and post
```

Or use full natural language:

```
"generate worklog for today"
"generate worklog for yesterday"
"generate worklog for 2024-10-28"
"post worklog to FaceFlip with 4 hours"
"list my povio projects"
```

### Keyboard Shortcuts

1. **Cursor Composer** (`Cmd+I` or `Cmd+K`): Type your command
2. **Chat** (`Cmd+L`): Use for longer workflows
3. **.cursorrules**: Add custom shortcuts (see `.cursorrules` file in project)

### Pro Tips

- Use `.cursorrules` file for project-specific shortcuts
- Type "wl" for quick worklog commands (if using .cursorrules)
- Save common project names as shortcuts in your rules
- Chain commands: "wl list, then post to FaceFlip 8 hours"

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

### List Povio Projects

```
You: "list my povio projects"
AI: [Uses list_povio_projects tool]
    Shows all your active projects with roles
```

### Post Worklog

```
You: "post worklog with 4 hours to FaceFlip"
AI: [Uses post_worklog tool]
    Automatically resolves project by name and posts

You: "post worklog with 6 hours to Autobiography"
AI: [Uses post_worklog tool]
    Posts to Autobiography
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

### 1. `list_povio_projects`

List all your active projects in Povio.

**Parameters:** None

**Returns:**
```
Found 6 active project(s):

• Autobiography (Ios Engineer)
• FaceFlip (Ios Engineer)
• Povio Estimations (Ios Engineer)
• Team Leads (Lead Engineer)
• iOS Internal (Ios Engineer)
• Bunny CDN Mobile (Ios Engineer)
```

**Usage:**
```
You: "list my povio projects"
AI: [Uses list_povio_projects tool]
    Shows all your active projects with roles
```

### 2. `generate_worklog`

Generate a worklog from git commits.

**Parameters:**
- `timeframe` (required): Date format - supports:
  - `"today"`, `"yesterday"`
  - Specific dates: `"2024-10-28"` (YYYY-MM-dd), `"10/28/2024"` (MM/dd/YYYY), `"28.10.2024"` (dd.MM.YYYY)
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
  "date": "2024-10-28",
  "description": "[ENG-155] Implement Screenshot Upload Feature",
  "commits": [
    "8e644dc - ENG-155 Implement Screenshot Upload Feature"
  ],
  "ticketNumbers": ["ENG-155"]
}
```

### 3. `post_worklog`

Post a worklog entry to Povio dashboard.

**Parameters:**
- `description` (required): Worklog description
- `projectName` (required): Project name (e.g., "FaceFlip", "Autobiography")
- `hours` (required): Number of hours worked
- `date` (required): Date in YYYY-MM-dd format

**Returns:**
```
✓ Worklog posted successfully!
Date: 2024-10-28
Hours: 4
Project ID: 15886
```

**Usage:**
```
You: "post worklog with 4 hours to FaceFlip"
AI: [Uses post_worklog tool]
    Automatically resolves "FaceFlip" and posts

You: "post 6 hours to Autobiography"
AI: [Uses post_worklog tool]
    Posts to Autobiography
```

### 4. `generate_and_post_worklog`

Combined tool that generates from commits and posts to Povio.

**Parameters:**
- `timeframe` (required): Date format - supports:
  - `"today"`, `"yesterday"`
  - Specific dates: `"2024-10-28"` (YYYY-MM-dd), `"10/28/2024"` (MM/dd/YYYY), `"28.10.2024"` (dd.MM.YYYY)
- `projectName` (required): Project name (e.g., "FaceFlip", "Autobiography")
- `hours` (required): Number of hours worked
- `repository` (optional): Path to git repository
- `enhanceWithAI` (optional): Defaults to `true`. Set to `false` to disable AI enhancement and auto-post (not recommended)

**Returns:**
Combined summary with generation and posting results.

**Note:** By default (AI enhancement enabled), the tool will:
1. Generate the worklog with AI enhancement prompt
2. Wait for AI to create optimized description
3. NOT post automatically (you'll then use `post_worklog` with the AI-generated description)

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

The `POVIO_API_TOKEN` should be set to **just the cookie token value**. The `_poviolabs_dashboard=` prefix is automatically added by the server.

### Step-by-Step Instructions:

1. **Log in** to [Povio Dashboard](https://app.povio.com)

2. **Open DevTools** (Press `F12` or right-click → Inspect)

3. **Go to Application/Storage tab**
   - Chrome/Edge: Click "Application" tab → "Cookies" → `https://app.povio.com`
   - Firefox: Click "Storage" tab → "Cookies" → `https://app.povio.com`
   - Safari: Enable Developer menu, then Develop → Show Web Inspector → Storage

4. **Find the cookie** named `_poviolabs_dashboard`

5. **Copy just the cookie value** (the part after `_poviolabs_dashboard=`):
   ```
   s%3Aabcd1234...xyz
   ```
   
   ⚠️ **Important**: 
   - Copy **only the value** (the part after the `=` sign)
   - Do NOT include `_poviolabs_dashboard=` - it's added automatically
   - The value is usually very long (300-500 characters)
   - Don't add quotes around it in the config

6. **Add to your Cursor MCP configuration** (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "povio-worklog": {
      "command": "npx",
      "args": ["-y", "povio-worklog-mcp"],
      "env": {
        "POVIO_API_TOKEN": "s%3Aabcd1234...your-actual-cookie-value"
      }
    }
  }
}
```

### Example (shortened for display):

```json
"POVIO_API_TOKEN": "s%3AY1lndE1GK256eTZzZmd0L2s5ODc2djdqaTdrL2VaZFlFS2..."
```

### Troubleshooting:

- ❌ **Wrong**: `"your-povio-token-value"` (placeholder text)
- ❌ **Wrong**: `"_poviolabs_dashboard=s%3Aabcd1234..."` (includes prefix - will still work but unnecessary)
- ✅ **Correct**: `"s%3Aabcd1234..."` (just the token value)

## Your Projects

Use `list_povio_projects` to see all your active projects with their IDs.

Common examples:
- **FaceFlip** (ID: 15886)
- **Autobiography** (ID: 14093)
- **Team Leads** (ID: 13396)
- **iOS Internal** (ID: 13247)

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

## Run Unattended in Claude Routines (Cloud)

The MCP server reads commits from the repo you are working in. For a scheduled run that does not need your Mac (a [Claude routine](https://code.claude.com/docs/en/routines)), use the `povio-worklog` CLI. It reads your commits from GitHub through `gh api` (no clone) and posts to Povio with the same code as the MCP tools. Local MCP usage is unchanged.

### CLI

```bash
# Commits for yesterday across one or more repos (all branches updated that day)
povio-worklog commits --repos owner/repo-a,owner/repo-b --date yesterday

# Post a finished description
povio-worklog post --project "FaceFlip" --hours 8 --date 2026-10-14 --description "[ONE-79] ..."
```

- `--date`: `today`, `yesterday`, `last-workday` (yesterday, but Friday on Sunday/Monday), `YYYY-MM-dd`, `MM/dd/YYYY`, `dd.MM.YYYY`
- `commits` prints the same Povio enhancement prompt as the MCP tool plus the commit data (`--json` for data only). When a day has no commits it says so and tells you not to post.
- `post` first checks Povio for an existing worklog on the same project and day and skips it (exit 0) rather than posting a duplicate; `--force` posts anyway. If that check fails, nothing is posted.
- `post --dry-run` prints what would be posted. Use `--description -` to read the text from stdin, `--project-id` instead of `--project` if you prefer.
- `logs --date today --project "FaceFlip"` lists existing entries.
- Exit code is non-zero when posting fails or every repo could not be read.

### Environment

| Variable | Purpose |
|----------|---------|
| `POVIO_API_TOKEN` | Povio token (same as the MCP config) |
| `WORKLOG_GITHUB_USER` | Your GitHub login, used as the commit author filter (falls back to `gh api user`) |
| `WORKLOG_TIMEZONE` | e.g. `Europe/Belgrade`. Cloud VMs run in UTC, so day boundaries need this |

### Routine setup

1. In the routine's cloud environment, set the variables above and allow `app.povio.com` under **Custom** network access (keep "include default list" checked). No GitHub token is needed.
2. Attach at least one repo you can read to the routine. It is not used for anything else, but without an attached repo the session has no `add_repo` tool. Attach a repo other than this package's own: if the working directory is this package, `npx` cannot find the `povio-worklog` command, so the prompt below runs every `npx` from `/tmp`.
3. Use a prompt like this, one routine per project and hours combination (the repos and project names here are examples):

```text
Create my Povio worklog for today.

Run every npx command from /tmp (cd /tmp && ...).

1. For each repo below, call the add_repo tool with read access (do not clone):
   acme-corp/mobile-app, acme-corp/web-dashboard
2. Run: cd /tmp && npx -y -p 'povio-worklog-mcp@^1.2.0' povio-worklog commits --repos acme-corp/mobile-app,acme-corp/web-dashboard --date today
3. If it reports no commits or an ERROR, stop and do not post anything.
4. Otherwise write the description following the guidelines in the output, keeping the [TICKET] format.
5. Run: cd /tmp && npx -y -p 'povio-worklog-mcp@^1.2.0' povio-worklog post --project "Acme App" --hours 8 --date <the date printed by commits> --description "<description>"
```

Repos are read through the session's GitHub access, so `add_repo` is required for each repo before `commits` runs. If it fails, the CLI prints the GitHub error for that repo. `post` skips on its own when an entry already exists, so a repeated run never duplicates a worklog.

Optionally end the prompt with a step asking the agent to send one short push notification with the result, so you see failures on your phone.

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
