#!/usr/bin/env node

/**
 * povio-worklog CLI
 *
 * Non-interactive entry point for running the worklog flow where no local git
 * checkout or MCP client is available, e.g. a Claude cloud routine:
 *
 *   povio-worklog commits --repos owner/a,owner/b --date yesterday
 *   povio-worklog validate --tickets ONE-1,ONE-2 --max-length 450 --description "..."
 *
 * Posting to Povio is done with Povio's official MCP server, not by this CLI.
 */

// Apply the timezone before any Date is created so "today"/"yesterday" and day
// boundaries are computed in the user's zone, not the machine's (cloud VMs run UTC).
if (process.env.WORKLOG_TIMEZONE) {
  process.env.TZ = process.env.WORKLOG_TIMEZONE;
}

import { DateParser } from './services/dateParser.js';
import { GitHubService } from './services/github.js';
import { WorklogFormatter } from './services/formatter.js';
import { generateAIEnhancementPrompt } from './tools/generate.js';
import { formatValidation, povioPostingInstructions, validateWorklog, POVIO_MCP_URL } from './tools/validate.js';
import { ParsedCommit } from './types/index.js';

const USAGE = `Usage:
  povio-worklog commits --repos <owner/name,...> [--date <date>] [--user <github-login>]
                        [--project <name>] [--hours <n>] [--json]
  povio-worklog validate --description <text | -> [--tickets <ID,ID,...>] [--max-length <chars>]

commits prints the description rules, the commit data and, unless --json, the steps to post
the worklog with Povio's official MCP server (${POVIO_MCP_URL}).
validate exits 1 if the description is missing a listed ticket or is longer than --max-length.

Dates: today, yesterday, last-workday, YYYY-MM-dd, MM/dd/YYYY, dd.MM.YYYY (default: yesterday)
Environment: WORKLOG_TIMEZONE (e.g. Europe/Belgrade), WORKLOG_GITHUB_USER`;

const REMOVED = `was removed in 2.0. Post and read time logs with Povio's official MCP server (${POVIO_MCP_URL}); use "povio-worklog validate" to check a description first.`;

type Flags = Record<string, string | boolean>;

function parseArgs(argv: string[]): { command: string | undefined; flags: Flags } {
  const [command, ...rest] = argv;
  const flags: Flags = {};
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (!arg.startsWith('--')) {
      throw new Error(`Unexpected argument: ${arg}`);
    }
    const key = arg.slice(2);
    const next = rest[i + 1];
    if (next === undefined || (next.startsWith('--') && next !== '-')) {
      flags[key] = true;
    } else {
      flags[key] = next;
      i++;
    }
  }
  return { command, flags };
}

function str(flags: Flags, key: string): string | undefined {
  const value = flags[key];
  return typeof value === 'string' ? value : undefined;
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Resolve a date argument. `last-workday` is yesterday, except Sunday/Monday
 * which resolve to the previous Friday.
 */
function resolveDate(input: string): { date: Date; displayName: string } {
  if (input.toLowerCase().trim() === 'last-workday') {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    do {
      d.setDate(d.getDate() - 1);
    } while (d.getDay() === 0 || d.getDay() === 6);
    return { date: d, displayName: 'last workday' };
  }
  return DateParser.parse(input);
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8').trim();
}

async function runCommits(flags: Flags): Promise<number> {
  const repos = (str(flags, 'repos') ?? '')
    .split(',')
    .map(r => r.trim())
    .filter(Boolean);
  if (repos.length === 0) {
    throw new Error('--repos is required (comma-separated owner/name list)');
  }
  for (const repo of repos) {
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
      throw new Error(`Invalid repo "${repo}". Expected owner/name.`);
    }
  }

  const parsedDate = resolveDate(str(flags, 'date') ?? 'yesterday');
  const from = new Date(parsedDate.date);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  const dateString = formatLocalDate(from);

  const github = new GitHubService(str(flags, 'user'));
  const login = await github.getLogin();

  const all: Array<ParsedCommit & { repo: string; branches: string[] }> = [];
  const errors: string[] = [];
  let apiCalls = 0;

  for (const repo of repos) {
    try {
      const result = await github.getCommitsBetween(repo, from, to);
      apiCalls += result.apiCalls;
      all.push(...result.commits.map(c => ({ ...c, repo })));
    } catch (error) {
      errors.push(`${repo}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Sort oldest first so the worklog reads in the order work was done
  all.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const commits: ParsedCommit[] = all.map(({ repo, branches, ...rest }) => rest);
  const worklog = WorklogFormatter.formatWorklog(commits, dateString);

  const output = {
    date: dateString,
    timezone: process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone,
    githubUser: login,
    repos,
    commitCount: all.length,
    ticketNumbers: worklog.ticketNumbers,
    autoDescription: worklog.description,
    commits: all.map(c => ({
      repo: c.repo,
      sha: c.hash,
      date: c.date,
      message: c.message,
      ticket: c.ticketNumber,
      branches: c.branches,
    })),
    apiCalls,
    errors,
  };

  if (flags.json) {
    console.log(JSON.stringify(output, null, 2));
  } else if (errors.length === repos.length) {
    console.log(`ERROR: could not read commits from any repository for ${dateString}. This is not an empty day; do not conclude there was no work.`);
    console.log(errors.join('\n'));
  } else if (all.length === 0) {
    console.log(`No commits found for ${dateString} (${parsedDate.displayName}) by ${login} in: ${repos.join(', ')}.`);
    console.log('Do not post a worklog for this date.');
    if (errors.length) console.log(`\nErrors:\n${errors.join('\n')}`);
  } else {
    console.log(generateAIEnhancementPrompt(commits, worklog.ticketNumbers, parsedDate.displayName));
    const hoursRaw = str(flags, 'hours');
    console.log('\n---\n' + povioPostingInstructions({
      date: dateString,
      hours: hoursRaw !== undefined ? Number(hoursRaw) : undefined,
      project: str(flags, 'project'),
      tickets: worklog.ticketNumbers,
      via: 'cli',
    }));
    console.log('\n---\nAUTO-GENERATED DESCRIPTION (for reference):');
    console.log(worklog.description);
    console.log('\n---\nCOMMIT DATA:');
    console.log(JSON.stringify(output, null, 2));
  }

  // Fail only when every repo failed, so a partial outage still yields a worklog
  return errors.length === repos.length ? 1 : 0;
}

async function runValidate(flags: Flags): Promise<number> {
  let description = str(flags, 'description');
  if (!description) throw new Error('--description is required (use "-" to read it from stdin)');
  if (description === '-') description = await readStdin();

  const tickets = (str(flags, 'tickets') ?? '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);
  const maxLengthRaw = str(flags, 'max-length');
  const maxLength = maxLengthRaw !== undefined ? Number(maxLengthRaw) : undefined;

  const result = validateWorklog({ description, tickets, maxLength });
  console.log(formatValidation(result));
  return result.valid ? 0 : 1;
}

async function main(): Promise<number> {
  const { command, flags } = parseArgs(process.argv.slice(2));
  if (!command || command === 'help' || flags.help) {
    console.log(USAGE);
    return command ? 0 : 1;
  }
  switch (command) {
    case 'commits':
      return runCommits(flags);
    case 'validate':
      return runValidate(flags);
    case 'post':
    case 'logs':
      throw new Error(`"${command}" ${REMOVED}`);
    default:
      throw new Error(`Unknown command: ${command}\n\n${USAGE}`);
  }
}

main()
  .then(code => process.exit(code))
  .catch(error => {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
