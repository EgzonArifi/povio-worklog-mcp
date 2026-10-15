# Troubleshooting Guide

## Error: "povio-worklog-mcp: command not found"

If you see this error when Cursor tries to start the MCP server:

```
sh: povio-worklog-mcp: command not found
```

### Quick Fixes (Try in Order)

#### 1. Clear npm Cache and Restart Cursor

This is the most common fix:

```bash
# Clear npm cache
npm cache clean --force

# Clear npx cache
rm -rf ~/.npm/_npx

# Restart Cursor completely (Cmd+Q and reopen)
```

#### 2. Test the Package Manually

Verify the package works outside of Cursor:

```bash
npx -y povio-worklog-mcp
```

You should see: `Worklog MCP Server running on stdio`

If this works but Cursor still fails, continue to solution 3.

#### 3. Use Full Node/NPX Paths

Some systems have PATH issues in GUI apps. Update your `~/.cursor/mcp.json` to use absolute paths:

```json
{
  "mcpServers": {
    "povio-worklog": {
      "command": "/usr/local/bin/npx",
      "args": ["-y", "povio-worklog-mcp"],
      "env": {
        "POVIO_API_TOKEN": "your-token-here"
      }
    }
  }
}
```

To find your npx path:
```bash
which npx
```

Common paths:
- macOS/Linux: `/usr/local/bin/npx` or `/opt/homebrew/bin/npx`
- Windows: `C:\Program Files\nodejs\npx.cmd`

#### 4. Check Node.js Version

Ensure you have Node.js 18.0.0 or higher:

```bash
node --version
```

If outdated, install the latest LTS version from [nodejs.org](https://nodejs.org/)

#### 5. Alternative: Use Local Installation

Instead of npx, clone and build locally:

```bash
# Clone the repository
git clone https://github.com/EgzonArifi/povio-worklog-mcp.git
cd mcp-server

# Install and build
npm install
npm run build
```

Then update your `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "povio-worklog": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/dist/index.js"],
      "env": {
        "POVIO_API_TOKEN": "your-token-here"
      }
    }
  }
}
```

## Other Common Issues

### Authentication Errors

If posting to Povio fails with authentication errors:

1. Check your token format - provide just the cookie value:
   ```
   s%3A...
   ```
   (The `_poviolabs_dashboard=` prefix is automatically added)

2. Get a fresh token from [Povio Dashboard](https://app.povio.com):
   - Open DevTools (F12)
   - Go to Application/Storage → Cookies
   - Copy **only the value** of `_poviolabs_dashboard` cookie (the part after `=`)

3. Make sure there are no extra quotes or spaces in the token

### No Commits Found

If worklog generation returns no commits:

1. Verify you're in a git repository:
   ```bash
   git status
   ```

2. Check if you have commits for the specified date:
   ```bash
   git log --since="today" --oneline
   ```

3. Ensure your git user email is configured:
   ```bash
   git config user.email
   ```

### Project Not Found

If you get "Project not found" errors:

1. List your projects first:
   ```
   wl list
   ```

2. Use the exact project name shown in the list

3. Alternatively, use the project ID directly

### Cursor Not Loading MCP Server

1. Check Cursor logs:
   - Help → Show Logs
   - Look for MCP-related errors

2. Verify your mcp.json syntax:
   ```bash
   # Check if valid JSON
   cat ~/.cursor/mcp.json | jq
   ```

3. Restart Cursor completely (Cmd+Q, not just close window)

### Permission Errors

If you see npm permission errors:

```bash
# Fix npm cache permissions (macOS/Linux)
sudo chown -R $(whoami) ~/.npm

# Or use nvm to manage Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install --lts
```

### Error: "calling 'initialize': EOF" in Antigravity

If you're getting an EOF (End of File) error during initialization in Antigravity but it works in Cursor:

**This issue has been addressed in version 1.0.8+** with improved error handling. Try these steps:

1. **Update to the latest version:**
   ```bash
   npm cache clean --force
   rm -rf ~/.npm/_npx
   ```
   Then restart Antigravity (npx will auto-update on next run)

2. **Use local installation instead of npx:**
   Some MCP clients handle local installations more reliably:
   ```bash
   # Clone and build locally
   git clone https://github.com/EgzonArifi/povio-worklog-mcp.git
   cd mcp-server
   npm install
   npm run build
   ```
   
   Then update your Antigravity MCP configuration to use the local path:
   ```json
   {
     "mcpServers": {
       "povio-worklog": {
         "command": "node",
         "args": ["/absolute/path/to/mcp-server/dist/index.js"],
         "env": {
           "POVIO_API_TOKEN": "your-token-here"
         }
       }
     }
   }
   ```

3. **Check Antigravity logs:**
   - Look for any error messages before the EOF error
   - Verify that Node.js is accessible from Antigravity's environment
   - Ensure the PATH includes Node.js binaries

4. **Verify the server starts correctly:**
   ```bash
   # Test the server manually
   node /path/to/mcp-server/dist/index.js
   ```
   The server should start and wait for input (you can press Ctrl+C to exit)

**Note:** The EOF error typically indicates the connection closed before the initialization handshake completed. The improved error handling in v1.0.8+ should prevent premature exits.

### No Commits Found (Timezone Issue)

If you're getting "No commits found" for today, yesterday, or specific dates, especially when using Antigravity:

**This issue has been fixed in version 1.0.8+** with timezone-aware date comparisons.

**The Problem:**
- Git returns commit dates in UTC (ISO format)
- Date comparisons were using local timezone
- This caused commits to be filtered out incorrectly, especially for dates near timezone boundaries

**The Fix:**
- Date comparisons now use date-only matching (year/month/day)
- This works correctly regardless of timezone differences
- Commits are now correctly matched to their authored date

**If you're still experiencing issues after updating:**

1. **Clear cache and update:**
   ```bash
   npm cache clean --force
   rm -rf ~/.npm/_npx
   ```
   Then restart your MCP client

2. **Verify commits exist:**
   ```bash
   # Check commits for today
   git log --since="today" --oneline --all
   
   # Check commits for yesterday
   git log --since="yesterday" --until="today" --oneline --all
   
   # Check your git user email (commits are filtered by author)
   git config user.email
   ```

3. **Test with a specific date:**
   Try using a specific date format like `2025-11-19` instead of "today" or "yesterday"

## Still Having Issues?

1. **Test manually first**: Run `npx -y povio-worklog-mcp` in your terminal to isolate if it's a Cursor issue

2. **Check Cursor version**: Make sure you're running the latest version of Cursor

3. **Report the issue**: Open an issue on GitHub with:
   - Your OS and Node.js version
   - Complete error message from Cursor logs
   - Output of `npx -y povio-worklog-mcp` in terminal
   - Your mcp.json configuration (without the token)

## Getting Help

- GitHub Issues: https://github.com/EgzonArifi/povio-worklog-mcp/issues
- Check for updates: `npm view povio-worklog-mcp version`
- Update to latest: Clear cache and restart Cursor (npx auto-updates)


