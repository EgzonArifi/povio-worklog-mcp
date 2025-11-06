# Povio Worklog MCP Server

<p align="left">
<div align="left">
  <img src="resources/povio-mcp-server.png" width="50%" alt="Povio Worklog MCP Server" />
</div>
</p>
<div align="left">

### **Automating Worklogs with MCP: From Minutes to Seconds**

**Egzon Arifi**  
**November 2025**

---

## 📋 Agenda (15-20 min)

1. **What is MCP?** (3-4 min)  
   *Understanding the USB-C for AI*

2. **The Problem** (2 min)  
   *Why worklog submission is painful*

3. **The Solution** (3-4 min)  
   *Automating worklogs with MCP*

4. **How It Works** (4-5 min)  
   *Cursor → MCP Server → Git & API*

5. **Live Demo** (2-3 min)  
   *"wl FaceFlip 8" and done!*

6. **Questions** (1-2 min)

---

## 🤔 What is MCP?

### Model Context Protocol

**MCP** is an **open-source standard** that allows AI applications to connect to external systems.

**Created by:** Anthropic  
**Purpose:** Standardize how AI connects to data sources, tools, and workflows

### Think of MCP as...

- **USB-C** → for connecting devices
- **REST API** → for web services
- **GraphQL** → for data queries
- **MCP** → for connecting AI to external systems

### What Can MCP Enable?

Real-world examples from the MCP ecosystem:

- 🎨 **Design to Code**: Cursor generates apps from Figma designs
- 🗓️ **Personal AI**: Claude accesses your Google Calendar and Notion
- 🤖 **Task managment**: Cursor creates/updates your tasks in Linear

## 🎯 Why MCP Matters

### Before MCP

**Every AI application needed custom integrations:**

- ❌ Different API for every data source/tool
- ❌ No standard way to connect AI to external systems
- ❌ Every integration is custom-built
- ❌ Limited reusability across different AI applications

### With MCP

**One standard protocol, like USB-C for AI:**

- ✅ **For Developers**: Build once, works with any MCP client (Cursor, Claude Desktop, etc.)
  - MCP reduces development time and complexity when building, or integrating with, an AI application or agent
- ✅ **For AI Applications**: Access an ecosystem of ready-made MCP servers
- ✅ **For Everyone**: Growing ecosystem of MCP servers to use

---

## 🔌 MCP = USB-C for AI

### The Perfect Analogy

```mermaid
graph LR
    subgraph USB[USB-C World]
        L[Laptop with USB-C port]
        L --> C1[Charger]
        L --> C2[External Drive]
        L --> C3[Monitor]
    end

    subgraph MCP[MCP World]
        A[Cursor with MCP]
        A --> S1[Worklog Server]
        A --> S2[GitHub Server]
        A --> S3[Database Server]
    end

    style L fill:#4A90E2
    style A fill:#4A90E2
    style C1 fill:#F5A623
    style C2 fill:#F5A623
    style C3 fill:#F5A623
    style S1 fill:#F5A623
    style S2 fill:#F5A623
    style S3 fill:#F5A623
```

| Aspect          | USB-C                   | MCP                               |
| --------------- | ----------------------- | --------------------------------- |
| **Device**      | Laptop with port        | Cursor IDE (MCP Client)           |
| **Standard**    | USB-C protocol          | MCP protocol                      |
| **Accessories** | Charger, drive, monitor | Worklog, GitHub, database servers |
| **Benefit**     | One port, many devices  | One AI app, many tools            |

**Key Insight:** Think of MCP like a USB-C port for AI applications. Just as USB-C provides a standardized way to connect electronic devices, MCP provides a standardized way to connect AI applications to external systems.

---

## 🎯 MCP Components Explained

### 1. **MCP Client** - The AI Application (Cursor)

**What is it?** An AI application that connects to MCP servers

**Think of it as:** Your USB-C device (laptop, phone) that can plug into accessories

**In our case: Cursor IDE**

- 🖥️ **Cursor** is the MCP Client
- 🤖 **Claude Sonnet 4** is the AI brain inside Cursor
- Together, they connect to MCP servers to get things done

**Other MCP Clients:**

- 💬 Claude Desktop App
- 🌐 VS Code
- 🤖 Custom AI applications

---

### 2. **MCP Server** - The Tool Provider

**What is it?** A lightweight program that exposes capabilities to MCP clients

**Think of it as:** USB-C accessories (charger, external drive, display)

**Examples from the ecosystem:**

- 🐙 **GitHub MCP Server** (GitHub integration)
- 🗄️ **Postgres MCP server** (Database queries)
- 🔍 **Brave Search MCP Server** (Web search)
- 🗂️ **Filesystem MCP Server** (Local files)
- 📊 **Povio Dashboard MCP Server** (ours!)

**What MCP servers can provide:**

- 📁 **Data Sources**: Git commits, files, databases, APIs
- 🔧 **Tools**: Search, calculations, API calls, data processing
- 📝 **Workflows**: Multi-step processes, automation

---

## 

## 🧩 The Two Parts of MCP

### Understanding MCP Architecture (Simplified)

```mermaid
graph TB
    subgraph Client[MCP Client AI Application]
        A[Cursor IDE with Claude Sonnet 4]
    end

    subgraph Servers[MCP Servers Tool Providers]
        C1[Povio Worklog Server]
        C2[GitHub MCP Server]
        C3[Database MCP Server]
    end

    subgraph External[What MCP Servers Connect To]
        D1[Data Sources: Git Files Databases]
        D2[Tools: APIs Search Calculators]
        D3[Workflows: Automations Processes]
    end

    A -->|MCP Protocol| C1
    A -->|MCP Protocol| C2
    A -->|MCP Protocol| C3

    C1 --> D1
    C1 --> D2
    C2 --> D1
    C2 --> D2
    C3 --> D1

    style A fill:#4A90E2
    style C1 fill:#F5A623
    style C2 fill:#F5A623
    style C3 fill:#F5A623
    style D1 fill:#7ED321
    style D2 fill:#7ED321
    style D3 fill:#7ED321
```

**MCP enables AI to connect to: Data Sources + Tools + Workflows**

---

## 😫 The Problem

### Current Worklog Workflow at Povio

```bash
# 1. Check what you worked on
$ git log --since="today"
# Copy commits manually... 📋

# 2. Open browser
# Navigate to Povio dashboard 🌐

# 3. Fill in form manually
# - Select project from dropdown
# - Type description (client-facing!)
# - Enter hours
# - Submit ✍️

# 4. Repeat for each day...
```

### Pain Points

- ⏰ **Time-consuming**: few minutes per day
- 🔄 **Repetitive**: Same process every day
- ❌ **Error-prone**: Typos, wrong projects, poor descriptions
- 📝 **Context switching**: Git → Browser → Form
- 😰 **End-of-week panic**: "What did I do on Tuesday?!"

---

## 💡 The Solution

### Transform This:

```bash
# Old way (5+ minutes)
$ git log --since="today"
# Copy commit messages
# Open Povio dashboard
# Fill in project, hours, description
# Submit
```

### Into This (in Cursor):

```bash
# New way (5 seconds) - Just type in :
wl FaceFlip 8  # Done! ✓
```

**Everything happens in Cursor - no context switching!**

---

## ⚡ Povio Worklog MCP Server

### Key Features

1. 📋 **List Projects** - View all active Povio projects
2. 🔍 **Generate Worklog** - Analyze git commits automatically
3. 🤖 **AI Enhancement** - Create professional, client-facing descriptions
4. 📤 **Post to Povio** - Submit directly to dashboard
5. ⚡ **Combined Action** - Generate + Post in one command

### Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Protocol**: MCP (Model Context Protocol)
- **MCP Client**: Cursor IDE with Claude Sonnet 4
- **MCP Server**: This tool (povio-worklog-mcp)
- **Git**: simple-git library
- **API**: Povio Dashboard REST API

---

### Provides

- 📁 **Data**: Git commit history (data source)
- 🔧 **Tools**: Format worklogs, post to Povio API (tools)
- 📝 **Workflow**: Generate + AI enhance + post (automated workflow)

## 🏗️ Architecture Overview

```mermaid
graph TB
    subgraph CursorClient[Cursor IDE MCP Client]
        A[You type: wl FaceFlip 8]
        B[Claude Sonnet 4 AI]
    end

    subgraph PovioServer[Povio Worklog MCP Server]
        C[MCP Protocol Handler]
        D[Tool Router]
        E[Git Service]
        F[Formatter Service]
        G[Povio API Service]
        H[Date Parser]
    end

    subgraph ExtServices[External Services]
        I[Local Git Repository]
        J[Povio Dashboard API]
    end

    A --> B
    B -->|MCP Protocol| C
    C --> D
    D --> E
    D --> F
    D --> G
    D --> H
    E -->|Read commits| I
    G -->|POST worklog| J

    style A fill:#4A90E2
    style B fill:#4A90E2
    style C fill:#7ED321
    style D fill:#7ED321
    style I fill:#F5A623
    style J fill:#F5A623
```

**Cursor (MCP Client) connects to MCP servers - you never leave your IDE!**

---

## 🔧 How It Works: Generate Worklog in Cursor

```mermaid
sequenceDiagram
    participant You
    participant Cursor as Cursor IDE (MCP Client)
    participant Server as Povio Worklog (MCP Server)
    participant Git as Git Repo

    You->>Cursor: Type "wl today"
    Note over Cursor: Claude decides to use generate_worklog tool
    Cursor->>Server: generate_worklog("today")
    Server->>Git: git log --since today --all
    Git-->>Server: commit list
    Note over Server: Filter by email, extract tickets, format
    Server-->>Cursor: Commits + description
    Note over Cursor: Claude formats the results nicely
    Cursor-->>You: Display worklog
```

**All happening inside Cursor in seconds!**

---

## 📊 Data Flow Example

### Input: Your Git Commits

```
8e644dc - ENG-155 Implement Screenshot Upload Feature
a2b3c4d - ENG-155 Add error handling for uploads  
d5e6f7g - ENG-155 Update UI for better UX
h8i9j0k - Fix typo in README
```

### Processing

1. **Filter** → Only YOUR commits
2. **Extract** → Ticket numbers: `ENG-155`
3. **Clean** → Remove technical jargon
4. **Combine** → Multiple commits into one description

### Output: Client-Facing Description

```
[ENG-155] Implemented screenshot upload functionality in developer 
settings with comprehensive error handling and improved user interface 
for enhanced user experience
```

---

## 🛠️ Available MCP Tools

### 1. `list_povio_projects`

```typescript
// No parameters required
// Returns: List of active projects with IDs
```

**Output Example:**

```
Found 6 active project(s):
• FaceFlip (Ios Engineer) - ID: 15886
• Autobiography (Ios Engineer) - ID: 14093
• Team Leads (Lead Engineer) - ID: 13396
• iOS Internal (Ios Engineer) - ID: 13247
```

---

### 2. `generate_worklog`

```typescript
{
  timeframe: "today" | "yesterday" | "2024-10-28",
  repository?: string,        // defaults to current dir
  enhanceWithAI?: boolean    // defaults to true
}
```

**What it does:**

1. Analyzes git commits
2. Filters by your email
3. Extracts ticket numbers (ENG-155, WAY-204, etc.)
4. Generates professional description
5. Returns formatted worklog

---

### 3. `post_worklog`

```typescript
{
  description: string,       // worklog text
  projectName: string,       // "FaceFlip", "Autobiography"
  hours: number,            // 4, 6, 8
  date: string              // "2024-10-28" (YYYY-MM-dd)
}
```

**What it does:**

1. Resolves project name to ID
2. Posts to Povio API
3. Returns confirmation

---

### 4. `generate_and_post_worklog`

```typescript
{
  timeframe: "today" | "yesterday" | "2024-10-28",
  projectName: string,       // "FaceFlip"
  hours: number,            // 8
  repository?: string,
  enhanceWithAI?: boolean   // defaults to true
}
```

**What it does:**

1. Generate worklog from git commits
2. AI enhancement (waits for Claude to optimize)
3. User confirms
4. Posts to Povio

---

## 🎬 Live Demo in Cursor

**All commands work in Cursor Chat (⌘L) or Composer (⌘I)**

### The Magic: Natural Language → Action

No forms, no browser, no context switching. Just type in Cursor:

| What You Type                    | What Happens                               |
| -------------------------------- | ------------------------------------------ |
| `"wl list"`                      | Shows all your Povio projects              |
| `"wl"`                           | Generates worklog from today's git commits |
| `"wl FaceFlip 8"`                | Generates + posts to FaceFlip, 8 hours     |
| `"wl yesterday Autobiography 6"` | Posts yesterday's work to Autobiography    |

---

### Example 1: List Your Projects

**You in Cursor:** `"wl list"`

**Cursor responds:**

```
Found 6 active projects:

• Autobiography (iOS Engineer) - ID: 14093
• FaceFlip (iOS Engineer) - ID: 15886
• Povio Estimations (iOS Engineer) - ID: 14004
• Team Leads (Lead Engineer) - ID: 13396
• iOS Internal (iOS Engineer) - ID: 13247
• Bunny CDN Mobile (iOS Engineer) - ID: 13802
```

✨ **Behind the scenes**: Cursor → Povio Worklog MCP Server → Povio API

---

### Example 2: Generate Worklog from Git

**You in Cursor:** `"wl"`

**Cursor responds:**

```
📊 Found 4 commits for today (Oct 28, 2024):

• 8e644dc - [ENG-155] Implement Screenshot Upload Feature
• a2b3c4d - [ENG-155] Add error handling for uploads
• d5e6f7g - [ENG-155] Update UI for better UX
• h8i9j0k - [ENG-156] Fix bug in settings screen

✍️ Generated description:
[ENG-155] Implemented screenshot upload functionality with error 
handling and UI improvements. [ENG-156] Fixed settings screen bug.
```

✨ **Behind the scenes**: Cursor → MCP Server → Git repo → AI formatting

---

### Example 3: The Full Workflow (Generate + Post)

**You in Cursor:** `"wl FaceFlip 8"`

**Cursor responds:**

```
🔍 Analyzing today's commits...
   Found 4 commits

🤖 AI-enhanced description:
   [ENG-155][ENG-156] Implemented screenshot upload functionality 
   in developer settings with comprehensive error handling and 
   improved UI, resolved settings screen navigation bug

📤 Posting to Povio...
   ✓ Worklog posted successfully!

📋 Summary:
   Date: Oct 28, 2024
   Hours: 8
   Project: FaceFlip (ID: 15886)
```

✨ **Behind the scenes**: 

1. Cursor → MCP Server → Git commits
2. Claude AI enhances description
3. MCP Server → Povio API
4. Cursor shows confirmation

**That's it! 5 seconds vs 5 minutes.**

---

## 💎 Why This Matters

### The Impact

**For Developers:**

- ⏰ **Time savings**: 2-5 min/day
- 🧠 **No context switching**: Everything in Cursor
- 📝 **Better quality**: AI writes professional descriptions
- 🎯 **Accuracy**: Based on actual git commits
- 🚀 **Simple**: Natural language commands

**For Teams:**

- ✅ **Consistency**: Everyone logs the same way
- 📊 **Visibility**: Better tracking across team
- 💰 **Client ready**: Professional descriptions on invoices

### 

---

## 🚀 Getting Started

### Step 1: Install (via npx - Recommended)

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "povio-worklog": {
      "command": "npx",
      "args": ["-y", "povio-worklog-mcp"],
      "env": {
        "POVIO_API_TOKEN": "YOUR_TOKEN"
      }
    }
  }
}
```

**That's it!** Auto-downloads latest version via npm.

---

### Step 2: Get Your Token

1. Login to [Povio Dashboard](https://app.povio.com)
2. Open DevTools (F12)
3. Go to Application → Cookies
4. Find `_poviolabs_dashboard`
5. Copy **just the cookie value** (the part after `=`):

```
s%3AY1lndE1GK256eTZzZmd0L2s5ODc...
```

⚠️ **Important**: Copy only the value - the `_poviolabs_dashboard=` prefix is automatically added!

---

### Step 3: Restart Cursor

That's it! Now you can use it in Cursor.

**Where to type commands:**

- 💬 **Cursor Chat** (`Cmd+L` / `Ctrl+L`) - For quick commands
- ✍️ **Cursor Composer** (`Cmd+I` / `Ctrl+I`) - For interactive workflows

**Commands:**

```bash
wl                          # Generate today
wl list                     # List projects
wl FaceFlip 8              # Generate + post
wl yesterday FaceFlip 6    # Yesterday's worklog
```

---

## 🎉 Key Takeaways

1. 🤖 **MCP has 2 parts:**
   
   - **MCP Client**: Cursor IDE with Claude (the AI application)
   - **MCP Servers**: Povio Worklog, GitHub, etc. (the tools)

2. 🖥️ **Cursor is an MCP Client** - it connects to MCP servers to extend its capabilities

3. 🧠 **Claude Sonnet 4** runs inside Cursor - it decides which MCP server tools to call

4. 🔌 **Like USB-C** - one standard protocol, connect to any MCP server

5. ⏰ **Time savings** - 2-4 hours/month per developer (real impact!)

6. 📝 **AI-powered** - Claude creates professional, client-ready descriptions

7. 🚀 **Easy setup** - just add 5 lines to `~/.cursor/mcp.json` and restart

8. 🔓 **Open & Extensible** - build your own MCP servers!

---

## 🙏 Thank You!

### Links

- 🐙 **GitHub**: https://github.com/egzonarifi/povio-worklog-mcp
- 📦 **npm**: https://www.npmjs.com/package/povio-worklog-mcp
- 💬 **Slack**: @egzon arifi

### Try It Out!

```bash
# Add to ~/.cursor/mcp.json and restart Cursor
# Then type: "wl list"
```

**Questions?** 🤔

---

**End of Presentation**  
**Thank you for your attention!** 🎉
