# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-10-20

### Added
- `povio-worklog post --max-length <chars>` refuses to post (exit 1) if the description is longer than the limit, so a long day cannot produce an oversized worklog. Use it together with `--tickets`.

## [1.3.0] - 2026-10-19

### Changed
- **Shorter, plainer worklog descriptions.** The enhancement prompt now asks for compact, high-level text: one short sentence per ticket for up to 4 tickets, and themed groups for 5 or more (all ticket IDs in one tag, one sentence per group, e.g. `[ONE-1, ONE-2, ONE-3] Fixed Android issues with the keyboard and menus.`). It bans filler words (delivered, comprehensive, polished, ...), skips tests/refactors/merges, and asks for only the final description with no commentary. This applies to both the MCP tools and the CLI.

### Added
- `povio-worklog post --tickets ONE-1,ONE-2` refuses to post (exit 1) if the description is missing any listed ticket, so grouping never drops a ticket.

## [1.2.0] - 2026-10-15

### Added
- `povio-worklog post` now checks Povio for an existing worklog on the same project and day and skips (exit 0) instead of posting a duplicate. `--force` posts anyway. If the check itself fails, nothing is posted.
- `povio-worklog logs [--date] [--project]` shows existing worklog entries.
- `PovioService.fetchTimeLogs` reads existing entries from Povio.

## [1.1.0] - 2026-10-15

### Added
- **`povio-worklog` CLI** for unattended runs such as Claude routines in the cloud:
  - `commits` reads your commits from GitHub via `gh api` (no clone), across several repos and every branch updated that day, and prints the Povio enhancement prompt plus commit data.
  - `post` posts a worklog to Povio (`--dry-run` supported), exiting non-zero on failure.
  - `WORKLOG_TIMEZONE` sets the timezone for day boundaries; `WORKLOG_GITHUB_USER` sets the author filter; `last-workday` date alias.
- `GitHubService` (`src/services/github.ts`) for reading commits through the GitHub API.

### Changed
- Commit filtering, merge-commit handling and deduplication moved from `GitService` into a shared `CommitParser` (`src/services/commitParser.ts`) so local git and GitHub sources behave the same. No behaviour change for the MCP server.

## [1.0.10] - 2025-11-19

### Added
- **Comprehensive debug logging**: Added detailed diagnostic logging to help identify why commits aren't found. Logs include:
  - Date parsing (input timeframe, parsed date, local date components)
  - Git configuration (user name and email)
  - Git query details (date range being queried)
  - Raw git results (total commits returned)
  - Sample commits before filtering (hash, message, author, date)
  - Author filtering results (commits after author matching)
  - Date filtering results (commits after date matching)
  - Final commit list with dates
  - Error details with stack traces
- All logs are written to stderr (stdout is reserved for MCP protocol) and can be viewed in Antigravity/Cursor logs

## [1.0.9] - 2025-11-19

### Fixed
- **Critical fix**: Removed `--until` parameter from git log queries which was excluding commits due to date boundary and timezone issues. Now fetches commits from a wider range (30 days back) and relies entirely on JavaScript filtering by author date, which is more reliable and timezone-aware.

## [1.0.8] - 2025-11-19

### Fixed
- **Critical timezone fix**: Fixed issue where commits were not found when using Antigravity or other MCP clients due to timezone mismatch between git commit dates (UTC) and local date comparisons. Now uses date-only comparisons (year/month/day) that work correctly across all timezones.
- Improved error handling for MCP server initialization to prevent EOF errors in Antigravity

### Changed
- Date comparison logic now compares dates by date components only (ignoring time and timezone)
- Added better error handling for unhandled promise rejections and uncaught exceptions
- Updated troubleshooting guide with Antigravity-specific fixes

## [1.0.7] - 2025-01-27

### Changed
- Version bump for npm publication

## [1.0.6] - 2025-11-03

### Changed
- Simplified token configuration: Users now only need to provide the bare token value. The `_poviolabs_dashboard=` prefix is automatically added by the server. This makes configuration easier and less error-prone.
- Updated all documentation (README, PRESENTATION, TROUBLESHOOTING) to reflect the simplified token setup

## [1.0.5] - 2025-11-03

### Changed
- Renamed package to `povio-worklog-mcp` and enhanced error handling
- Fixed repository URL format for npm metadata
- Documentation updates in README

## [1.0.3] - 2024-10-28

### Changed
- Updated date format notation to use lowercase `dd` (YYYY-MM-dd, MM/dd/YYYY, dd.MM.YYYY)

## [1.0.2] - 2024-10-28

### Changed
- Updated all date format examples in documentation to use day 28 (Oct 28) for clarity
- Added format indicators (YYYY-MM-dd, MM/dd/YYYY, dd.MM.YYYY) to make date formats unambiguous
- Improved date examples across README.md, PRESENTATION.md, .cursorrules, and src/index.ts

## [1.0.1] - 2024-10-28

### Added
- Initial release of povio-worklog-mcp
- List Povio projects tool
- Generate worklog from git commits with AI enhancement
- Post worklog to Povio dashboard
- Combined generate and post tool
- Support for project names (automatically resolved to IDs)
- Flexible date parsing (today, yesterday, specific dates)
- Smart ticket number extraction
- Professional worklog formatting following Povio guidelines

### Features
- AI-enhanced worklog generation (enabled by default)
- Client-appropriate descriptions automatically generated
- Support for multiple date formats
- Integration with MCP protocol for Cursor AI
- Automatic project name resolution

## [Unreleased]

### Planned
- Support for editing existing worklogs
- Bulk worklog operations
- Custom formatting templates


