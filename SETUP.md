# Quick Setup Guide

## ✅ Already Done

The MCP server has been created and built! Here's what exists:

```
/Users/egzonarifi/Documents/GitHub/Aurascan/mcp-server/
├── dist/              ✅ Compiled JavaScript (ready to run)
├── src/               ✅ TypeScript source code
├── package.json       ✅ Dependencies installed
└── README.md          ✅ Full documentation
```

## 🚀 Next Steps to Use in Cursor

### Step 1: Get Your Povio API Token

Your existing token should be at: `~/.config/povio/worklog.conf`

If you need to refresh it:
```bash
~/.local/bin/worklog/post-worklog.sh --setup
```

### Step 2: Configure Cursor

**Option A: Via Cursor Settings UI**
1. Open Cursor Settings (`Cmd + ,`)
2. Search for "Model Context Protocol" or "MCP"
3. Click "Edit MCP Settings"
4. Add this configuration:

```json
{
  "mcpServers": {
    "worklog": {
      "command": "node",
      "args": ["/Users/egzonarifi/Documents/GitHub/Aurascan/mcp-server/dist/index.js"],
      "env": {
        "POVIO_API_TOKEN": "paste-your-token-here",
        "DEFAULT_PROJECT_ID": "15886"
      }
    }
  }
}
```

**Option B: Edit Config File Directly**

Edit `~/.cursor/mcp_settings.json` and add the same configuration.

### Step 3: Restart Cursor

Close and reopen Cursor to load the MCP server.

### Step 4: Test It!

In Cursor, try these commands:

```
"generate worklog for today"
"post worklog with 4 hours"
"generate and post worklog for today, log 4 hours"
```

## 🔄 Comparison: Shell Script vs MCP

### Using Shell Scripts (Current Way)

```
You: "generate and post worklog for today, log 4 hours"

AI executes:
~/.local/bin/worklog/generate-and-post-worklog.sh -t today --post -p 15886 -h 4

✅ Fast to set up
✅ No dependencies
❌ Raw text output
❌ New process each time
```

### Using MCP Server (New Way)

```
You: "generate and post worklog for today, log 4 hours"

AI calls:
mcp_worklog_generate_and_post_worklog({
  timeframe: "today",
  projectId: 15886,
  hours: 4
})

✅ Structured JSON responses
✅ Type-safe
✅ Persistent process (faster after first call)
✅ Better error messages
❌ Requires setup
```

## 📊 Testing Both

You can use both approaches in the same Cursor session!

**Shell script approach:**
- Will continue to work exactly as before
- No changes needed to your existing setup

**MCP approach:**
- Add the MCP config
- Restart Cursor
- Now AI can choose either method

The AI will automatically pick the best tool based on context.

## 🔧 Troubleshooting

### Check if Server is Configured

After restart, the AI should see these tools:
- `mcp_worklog_generate_worklog`
- `mcp_worklog_post_worklog`
- `mcp_worklog_generate_and_post_worklog`

### Test the Server Manually

```bash
# This should start without errors and wait for input
node /Users/egzonarifi/Documents/GitHub/Aurascan/mcp-server/dist/index.js

# Press Ctrl+C to exit
```

### Check Token

```bash
# Read your existing token
cat ~/.config/povio/worklog.conf
```

## 📝 Usage Examples

Once configured, you can use natural language:

```
"what did I work on today?"
→ Generates worklog, shows commits

"log 6 hours to aurascan"
→ Posts to project 15886 with 6 hours

"generate and post yesterday's work with 8 hours"
→ Analyzes yesterday's commits and posts

"show me my commits from yesterday"
→ Just shows git commits without posting
```

## 🎯 Recommendation

**For Evaluation:**

1. **Keep using shell scripts** for your normal workflow
2. **Add MCP configuration** (takes 2 minutes)
3. **Test MCP approach** on a few worklogs
4. **Compare:**
   - Speed
   - Accuracy
   - Error handling
   - Convenience

After a few days, you'll have a clear preference!

## 🤝 Sharing with Team

If you like the MCP approach, teammates can:

1. Clone this repo
2. Run `cd mcp-server && npm install && npm run build`
3. Add their own Cursor config with their token
4. Done!

Each person gets the same functionality in their Cursor.




