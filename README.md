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

An MCP server that turns your git commits into short, invoice-ready Povio worklog descriptions. Posting is done by **Povio's official MCP server** (`https://app.povio.com/mcp`), which signs in with your dashboard account, so there is no cookie token to copy or renew.

```
wl FaceFlip 8   # commits → description → posted to Povio
```

> **Upgrading from 1.x?** See [Migrating to 2.0](#migrating-to-20).

## How it works

| Step | Done by |
|------|---------|
| Read your commits (local git, or GitHub without cloning) | this package |
| Description rules: compact, high level, every ticket ID, grouping for long days | this package |
| Check tickets and length before posting (`validate_worklog`) | this package |
| Find the project, check for an existing entry, post the time log | Povio's MCP (`professional_*` tools) |

## Features

- 🔍 **Generate Worklog**: analyzes your commits (all branches, only yours) and returns rules for a short, professional description
- 🎫 **Ticket IDs**: extracts IDs like ENG-155; one sentence per ticket up to 4, themed groups for 5 or more
- ✅ **Validate**: checks every ticket ID is present and the text is not too long, without any Povio token
- 📅 **Flexible Dates**: "today", "yesterday", `2024-10-28`, `10/28/2024`, `28.10.2024`
- ☁️ **Cloud routines**: `povio-worklog` CLI reads commits from GitHub, no clone needed

## Installation

You need two MCP servers: this one, and Povio's.

### 1. This package

**Cursor** (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "povio-worklog": {
      "command": "npx",
      "args": ["-y", "povio-worklog-mcp@^2"]
    }
  }
}
```

**Claude Code:**

```bash
claude mcp add povio-worklog -- npx -y povio-worklog-mcp@^2
```

No environment variables are needed. The repository is the current working directory unless you pass `repository`.

### 2. Povio's MCP server

**Cursor**: add it next to the entry above, then click **Connect** next to it in Settings → MCP:

```json
{
  "mcpServers": {
    "povio-dashboard": {
      "url": "https://app.povio.com/mcp"
    }
  }
}
```

**Claude Code**: add it, then run `/mcp`, pick `povio-dashboard` and sign in in the browser:

```bash
claude mcp add --transport http povio-dashboard https://app.povio.com/mcp
```

**Claude (web/desktop)**: Settings → Connectors → Add custom connector, URL `https://app.povio.com/mcp`.

Fully restart Cursor (Cmd+Q) after editing `mcp.json`.

> **⚠️ Getting "command not found" error?** See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

## Usage

```
wl                          → Generate worklog for today
wl yesterday                → Generate worklog for yesterday
wl 2024-10-28               → Generate worklog for a specific date
wl FaceFlip 8               → Generate and post to FaceFlip, 8 hours
wl yesterday FaceFlip 8     → Generate yesterday's worklog and post
"list my povio projects"    → Answered by Povio's MCP
```

When you ask to post, the assistant:

1. calls `generate_worklog` and writes the description,
2. calls `validate_worklog` with the ticket IDs and a 450-character limit,
3. calls Povio's `professional_list_available_project_users` to find the project,
4. calls `professional_list_time_logs` and stops if that day already has an entry for the project,
5. calls `professional_save_time_log`.

These steps are included in the `generate_worklog` output, so the assistant does not need to know them in advance.

## Available Tools

### `generate_worklog`

**Parameters:**
- `timeframe` (required): `"today"`, `"yesterday"`, `"2024-10-28"`, `"10/28/2024"` or `"28.10.2024"`
- `repository` (optional): path to the git repository (defaults to the current directory)
- `project`, `hours` (optional): used in the posting steps when you want to post
- `enhanceWithAI` (optional): defaults to `true`; `false` returns the basic auto-generated description

**Returns:** your commits, the ticket IDs, the description rules and the posting steps.

### `validate_worklog`

**Parameters:**
- `description` (required)
- `tickets` (optional): ticket IDs that must appear
- `maxLength` (optional): maximum characters (450 suggested)

**Returns:** `VALID (312 characters). Ready to post.` or `INVALID - do not post.` with the reasons.

## Description rules

Descriptions appear on client invoices exactly as written. The rules ask for:

- about 300 characters on a normal day, plain past-tense verbs, no filler words
- what changed for the product, not how it was built; no branch names, PR numbers or file names
- tests, refactors and merges left out unless that was the only work
- one sentence per ticket for up to 4 tickets; for 5 or more, 2–4 themed groups with all IDs in one tag:

```
[ENG-201, ENG-202, ENG-203] Updated wording and labels in profile, signup and settings. [ENG-204, ENG-205] Fixed Android issues with the keyboard and menus.
```

Only commits by you are counted (matched on your git `user.name` / `user.email`).

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

For a scheduled run that does not need your Mac (a [Claude routine](https://code.claude.com/docs/en/routines)), use the `povio-worklog` CLI to read commits from GitHub through `gh api` (no clone), and Povio's MCP as a routine connector to post.

### CLI

```bash
# Commits for yesterday across one or more repos (all branches updated that day)
povio-worklog commits --repos owner/repo-a,owner/repo-b --date yesterday --project "FaceFlip" --hours 8

# Check a finished description before posting
povio-worklog validate --tickets ONE-1,ONE-2 --max-length 450 --description "[ONE-1] ..."
```

- `--date`: `today`, `yesterday`, `last-workday` (yesterday, but Friday on Sunday/Monday), `YYYY-MM-dd`, `MM/dd/YYYY`, `dd.MM.YYYY`
- `commits` prints the description rules, the posting steps (with `--project` and `--hours` filled in) and the commit data. `--json` prints data only. When a day has no commits it says so and tells you not to post. It exits 1 only when no repo could be read.
- `validate` exits 1 when a listed ticket is missing or the text is longer than `--max-length`. `--description -` reads stdin.

### Environment

| Variable | Purpose |
|----------|---------|
| `WORKLOG_GITHUB_USER` | Your GitHub login, used as the commit author filter (falls back to `gh api user`) |
| `WORKLOG_TIMEZONE` | e.g. `Europe/Belgrade`. Cloud VMs run in UTC, so day boundaries need this |

### Routine setup

1. Connect Povio's MCP in claude.ai (Settings → Connectors → Add custom connector, `https://app.povio.com/mcp`) and add it to the routine. It only needs `professional_list_available_project_users`, `professional_list_time_logs` and `professional_save_time_log`; leave the manage tools off.
2. In the routine's cloud environment, set the variables above. No Povio token or extra network access is needed.
3. Attach at least one repo you can read to the routine. Without an attached repo the session has no `add_repo` tool. Attach a repo other than this package's own: if the working directory is this package, `npx` cannot find the `povio-worklog` command, so the prompt below runs every `npx` from `/tmp`.
4. Use a prompt like this, one routine per project and hours combination (the repos and project names here are examples):

```text
Create my Povio worklog for today.

Run every npx command from /tmp (cd /tmp && ...).

1. For each repo below, call the add_repo tool with read access (do not clone):
   acme-corp/mobile-app, acme-corp/web-dashboard
2. Run: cd /tmp && npx -y -p 'povio-worklog-mcp@^2' povio-worklog commits --repos acme-corp/mobile-app,acme-corp/web-dashboard --date today --project "Acme App" --hours 8
3. If it reports no commits or an ERROR, stop and do not post anything.
4. Otherwise write the description following the rules in the output, then follow its POSTING steps:
   validate with povio-worklog validate, then post with the Povio connector.
```

Repos are read through the session's GitHub access, so `add_repo` is required for each repo before `commits` runs. The posting steps check Povio for an existing entry first, so a repeated run never duplicates a worklog.

## Migrating to 2.0

2.0 removes the cookie-based Povio integration. The `_poviolabs_dashboard` token expired every week or two; Povio's own MCP server signs in with OAuth instead.

| 1.x | 2.0 |
|-----|-----|
| `post_worklog` | Povio's `professional_save_time_log` |
| `list_povio_projects` | Povio's `professional_list_available_project_users` |
| `generate_and_post_worklog` | `generate_worklog` with `project` and `hours`, then the posting steps it returns |
| CLI `post --tickets --max-length` | CLI `validate`, then Povio's MCP |
| CLI `logs` | Povio's `professional_list_time_logs` |
| `POVIO_API_TOKEN`, `DEFAULT_PROJECT_ID` | not used; remove them |

To migrate: add Povio's MCP server ([Installation](#2-povios-mcp-server)) and remove `POVIO_API_TOKEN` from your `povio-worklog` config. `wl FaceFlip 8` keeps working. To stay on 1.x for now, pin `povio-worklog-mcp@^1`.

## Troubleshooting

### Server Not Starting

1. Check that the server was built: `ls -la dist/index.js`
2. Test it manually: `node dist/index.js` (it should wait for input)
3. Check Cursor logs for MCP errors

### Posting does not work

Posting goes through Povio's MCP server. Check that `povio-dashboard` is connected and signed in (Cursor: Settings → MCP; Claude Code: `/mcp`). The assistant only shows the description when Povio's tools are missing.

### No Commits Found

1. Verify you're in a git repository: `git status`
2. Check you have commits that day: `git log --since="today" --oneline --all`
3. Only commits whose author matches your git `user.name` / `user.email` are counted

## Architecture

- `src/services/git.ts` - local git commit reading
- `src/services/github.ts` - GitHub commit reading for the CLI (`gh api`)
- `src/services/commitParser.ts` - shared author filtering and deduplication
- `src/services/formatter.ts` - ticket extraction and basic formatting
- `src/tools/generate.ts` - description rules
- `src/tools/validate.ts` - validation and posting steps
- `src/index.ts` - MCP server; `src/cli.ts` - CLI

## License

MIT
