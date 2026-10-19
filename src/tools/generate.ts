import { GitService } from '../services/git.js';
import { WorklogFormatter } from '../services/formatter.js';
import { DateParser } from '../services/dateParser.js';
import { GenerateWorklogArgs, WorklogData } from '../types/index.js';

import { resolve } from 'path';

export async function generateWorklog(args: GenerateWorklogArgs): Promise<WorklogData> {
  try {
    // Use provided repository path or try to detect it
    // Resolve to absolute path to avoid issues with relative paths
    const repositoryPath = args.repository 
      ? resolve(args.repository) 
      : process.cwd();
    
    console.error('[DEBUG] generateWorklog called');
    console.error(`[DEBUG] Repository path: ${repositoryPath}`);
    console.error(`[DEBUG] Timeframe: "${args.timeframe}"`);
    
    const gitService = new GitService(repositoryPath);
    
    // Parse the timeframe into a date
    const parsedDate = DateParser.parse(args.timeframe);
    console.error(`[DEBUG] Parsed date: ${parsedDate.date.toISOString()} (local: ${parsedDate.date.getFullYear()}-${String(parsedDate.date.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.date.getDate()).padStart(2, '0')})`);
    console.error(`[DEBUG] Display name: "${parsedDate.displayName}"`);
    
    // Get commits for the parsed date
    console.error('[DEBUG] Fetching commits for date...');
    const commits = await gitService.getCommitsForDate(parsedDate.date);
    console.error(`[DEBUG] Retrieved ${commits.length} commits`);
    
    // Format date as YYYY-MM-DD (using local timezone to avoid timezone shifts)
    const year = parsedDate.date.getFullYear();
    const month = String(parsedDate.date.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    // Format into worklog
    const worklog = WorklogFormatter.formatWorklog(commits, dateString);
    console.error(`[DEBUG] Worklog formatted: ${worklog.description.substring(0, 100)}...`);
    
    // AI enhancement is enabled by default (can be disabled with enhanceWithAI: false)
    const shouldEnhance = args.enhanceWithAI !== false;
    
    if (shouldEnhance) {
      worklog.rawCommits = commits;
      worklog.aiEnhancementPrompt = generateAIEnhancementPrompt(commits, worklog.ticketNumbers, parsedDate.displayName);
    }
    
    return worklog;
  } catch (error) {
    // Log error to stderr for debugging (won't appear in MCP response)
    console.error('Error in generateWorklog:', error);
    
    // Return a helpful error message
    const parsedDate = DateParser.parse(args.timeframe);
    const year = parsedDate.date.getFullYear();
    const month = String(parsedDate.date.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    return {
      date: dateString,
      description: `Error generating worklog: ${error instanceof Error ? error.message : 'Unknown error'}. Please check that the repository path is correct and git is accessible.`,
      commits: [],
      ticketNumbers: [],
    };
  }
}

/** Ticket count at which descriptions switch from one sentence per ticket to themed groups. */
export const GROUP_THRESHOLD = 5;

export function generateAIEnhancementPrompt(commits: any[], ticketNumbers: string[], displayName: string): string {
  const commitDetails = commits.map(c => {
    let detail = `- ${c.hash}: ${c.message} (${c.type})`;
    // Include commit body if present for richer context
    if (c.body && c.body.trim()) {
      // Indent body lines for better readability
      const bodyLines = c.body.trim().split('\n').map((line: string) => `  ${line}`).join('\n');
      detail += `\n${bodyLines}`;
    }
    return detail;
  }).join('\n');

  const grouped = ticketNumbers.length >= GROUP_THRESHOLD;

  const formatRules = ticketNumbers.length === 0
    ? `✓ No ticket numbers: write one plain sentence (two at most) for the whole day, no tags.`
    : grouped
    ? `✓ ${ticketNumbers.length} TICKETS - GROUP THEM. Do not write one sentence per ticket.
✓ Sort the tickets into 2-4 themes (e.g. UI copy and polish, Android fixes, offline and reliability, or one feature area).
✓ Tag each group with ALL of its ticket numbers, then ONE sentence of 25 words or fewer naming the areas touched at a high level.
✓ Format: [TICKET-1, TICKET-2, TICKET-3] Group sentence. [TICKET-4, TICKET-5] Group sentence.
✓ Every ticket number above must appear in exactly one tag. Do not drop or invent tickets.`
    : `✓ ${ticketNumbers.length} TICKET${ticketNumbers.length > 1 ? 'S' : ''}: one short sentence per ticket, 15 words or fewer, the [TICKET-123] tag directly before it.
✓ Format: [TICKET-1] Sentence one. [TICKET-2] Sentence two.
✓ Merge closely related commits for the same ticket into one sentence.`;

  return `
📋 WORKLOG ENHANCEMENT REQUEST (${displayName})

Write the worklog description for these commits. It appears on client invoices, so it must be short, plain and professional.

COMMITS:
${commitDetails}

TICKET NUMBERS: ${ticketNumbers.join(', ') || 'None'}

FORMAT:
${formatRules}

STYLE RULES:
✓ Compact: aim for 300 characters or fewer on a normal day. Never pad.
✓ High level: say what changed for the user or product, not how it was built.
✓ Plain past-tense verbs: Added, Fixed, Updated, Renamed, Removed, Improved.
✓ No filler: never use delivered, comprehensive, polished, robust, seamless, enhanced, strengthened, streamlined, leveraged, various or numerous.
✓ Leave out tests, refactors, merge commits, tooling and maintenance, unless that was the only work.
✓ No branch names, PR numbers, file names or technical jargon.

EXAMPLES:
2 tickets:
  [ENG-101] Added password reset by email. [ENG-102] Fixed the login timeout on slow connections.
7 tickets, grouped:
  [ENG-201, ENG-202, ENG-203] Updated wording and labels in profile, signup and settings. [ENG-204, ENG-205, ENG-206] Fixed Android issues with the keyboard, menus and location lookup. [ENG-207] Added offline handling to the chat.

OUTPUT:
Give only the final description in one code block, with no explanation or commentary.
`.trim();
}




