import { GitService } from '../services/git.js';
import { WorklogFormatter } from '../services/formatter.js';
import { GenerateWorklogArgs, WorklogData } from '../types/index.js';

export async function generateWorklog(args: GenerateWorklogArgs): Promise<WorklogData> {
  const gitService = new GitService(args.repository);
  
  // Get commits based on timeframe
  const commits = args.timeframe === 'today' 
    ? await gitService.getTodayCommits()
    : await gitService.getYesterdayCommits();
  
  // Determine the date
  const date = args.timeframe === 'today'
    ? new Date().toISOString().split('T')[0]
    : new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  // Format into worklog
  const worklog = WorklogFormatter.formatWorklog(commits, date);
  
  // AI enhancement is enabled by default (can be disabled with enhanceWithAI: false)
  const shouldEnhance = args.enhanceWithAI !== false;
  
  if (shouldEnhance) {
    worklog.rawCommits = commits;
    worklog.aiEnhancementPrompt = generateAIEnhancementPrompt(commits, worklog.ticketNumbers);
  }
  
  return worklog;
}

function generateAIEnhancementPrompt(commits: any[], ticketNumbers: string[]): string {
  const commitDetails = commits.map(c => 
    `- ${c.hash}: ${c.message} (${c.type})`
  ).join('\n');

  return `
📋 WORKLOG ENHANCEMENT REQUEST

Based on these commits, generate an improved worklog description following Povio guidelines:

COMMITS:
${commitDetails}

TICKET NUMBERS: ${ticketNumbers.join(', ') || 'None'}

POVIO GUIDELINES:
✓ Logs appear on client invoices - must be professional and appropriate
✓ Describe what was accomplished for the client (not technical details)
✓ Use dense, descriptive format combining multiple accomplishments
✓ Include ticket numbers in [TICKET-123] format
✓ Focus on business value and user-facing features
✓ Avoid: branch names, PR numbers, technical jargon, internal processes
✓ Example: "[ENG-155] Implemented screenshot upload feature in developer settings"

TASK:
Generate a single, comprehensive worklog description (1-2 sentences) that:
1. Groups related work by ticket number
2. Describes accomplishments in client-appropriate language
3. Focuses on what was delivered, not how it was done
4. Is concise but informative

Return ONLY the enhanced worklog description, nothing else.
`.trim();
}




