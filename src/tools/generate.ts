import { GitService } from '../services/git.js';
import { WorklogFormatter } from '../services/formatter.js';
import { DateParser } from '../services/dateParser.js';
import { GenerateWorklogArgs, WorklogData } from '../types/index.js';

export async function generateWorklog(args: GenerateWorklogArgs): Promise<WorklogData> {
  const gitService = new GitService(args.repository);
  
  // Parse the timeframe into a date
  const parsedDate = DateParser.parse(args.timeframe);
  
  // Get commits for the parsed date
  const commits = await gitService.getCommitsForDate(parsedDate.date);
  
  // Format date as YYYY-MM-DD (using local timezone to avoid timezone shifts)
  const year = parsedDate.date.getFullYear();
  const month = String(parsedDate.date.getMonth() + 1).padStart(2, '0');
  const day = String(parsedDate.date.getDate()).padStart(2, '0');
  const dateString = `${year}-${month}-${day}`;
  
  // Format into worklog
  const worklog = WorklogFormatter.formatWorklog(commits, dateString);
  
  // AI enhancement is enabled by default (can be disabled with enhanceWithAI: false)
  const shouldEnhance = args.enhanceWithAI !== false;
  
  if (shouldEnhance) {
    worklog.rawCommits = commits;
    worklog.aiEnhancementPrompt = generateAIEnhancementPrompt(commits, worklog.ticketNumbers, parsedDate.displayName);
  }
  
  return worklog;
}

function generateAIEnhancementPrompt(commits: any[], ticketNumbers: string[], displayName: string): string {
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

  const hasMultipleTickets = ticketNumbers.length > 1;

  return `
📋 WORKLOG ENHANCEMENT REQUEST (${displayName})

Based on these commits, generate an improved worklog description following Povio guidelines:

COMMITS:
${commitDetails}

TICKET NUMBERS: ${ticketNumbers.join(', ') || 'None'}

POVIO GUIDELINES:
✓ Logs appear on client invoices - must be professional and appropriate
✓ Describe what was accomplished for the client (not technical details)
✓ Use dense, descriptive format combining multiple accomplishments
✓ Include ticket numbers in [TICKET-123] format DIRECTLY BEFORE their description
✓ Focus on business value and user-facing features
✓ Avoid: branch names, PR numbers, technical jargon, internal processes

FORMAT REQUIREMENTS:
${hasMultipleTickets ? 
`✓ MULTIPLE TICKETS: Place each ticket number directly before its accomplishment
✓ Format: [TICKET-1] Description one. [TICKET-2] Description two. [TICKET-3] Description three
✓ This allows clear attribution and better invoicing/tracking` :
`✓ SINGLE TICKET: Place ticket number at the start
✓ Format: [TICKET-123] Description of what was accomplished`
}

EXAMPLES:
Single ticket:
  [ENG-155] Implemented screenshot upload feature in developer settings

Multiple tickets:
  [ENG-101] Set up initial project structure. [ENG-102] Implemented user authentication. [ENG-103] Created dashboard UI
  [PROJ-45] Fixed login timeout issue. [PROJ-46] Added password reset functionality

TASK:
Generate a comprehensive worklog description that:
1. Places each [TICKET] directly before its specific accomplishment
2. Describes accomplishments in client-appropriate language
3. Focuses on what was delivered, not how it was done
4. Is concise but informative
5. Uses periods to separate different tickets' work

IMPORTANT FORMATTING:
Present the enhanced description in TWO formats for best user experience:

1. ENHANCED DESCRIPTION (readable):
${hasMultipleTickets ? '[TICKET-1] Description one. [TICKET-2] Description two' : '[TICKET-123] Your enhanced description here'}

2. COPYABLE VERSION:
\`\`\`
${hasMultipleTickets ? '[TICKET-1] Description one. [TICKET-2] Description two' : '[TICKET-123] Your enhanced description here'}
\`\`\`

Then provide brief context explaining why this follows Povio guidelines and maintains clear ticket attribution.
`.trim();
}




