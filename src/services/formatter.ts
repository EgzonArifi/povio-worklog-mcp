import { ParsedCommit, WorklogData } from '../types/index.js';

export class WorklogFormatter {
  /**
   * Format commits into a professional worklog description
   */
  static formatWorklog(commits: ParsedCommit[], date: string): WorklogData {
    if (commits.length === 0) {
      return {
        date,
        description: 'No commits found for this timeframe.',
        commits: [],
        ticketNumbers: [],
      };
    }

    // Group commits by ticket number
    const groupedByTicket = this.groupByTicket(commits);
    
    // Generate professional description
    const description = this.generateDescription(groupedByTicket);
    
    // Extract unique ticket numbers
    const ticketNumbers = [...new Set(
      commits.map(c => c.ticketNumber).filter((t): t is string => t !== null)
    )];

    // Format commit list
    const commitList = commits.map(c => `${c.hash} - ${c.message}`);

    return {
      date,
      description,
      commits: commitList,
      ticketNumbers,
    };
  }

  /**
   * Group commits by ticket number
   */
  private static groupByTicket(commits: ParsedCommit[]): Map<string, ParsedCommit[]> {
    const grouped = new Map<string, ParsedCommit[]>();

    for (const commit of commits) {
      const key = commit.ticketNumber || 'General';
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(commit);
    }

    return grouped;
  }

  /**
   * Generate professional description from grouped commits
   */
  private static generateDescription(grouped: Map<string, ParsedCommit[]>): string {
    const descriptions: string[] = [];

    for (const [ticket, commits] of grouped.entries()) {
      const summary = this.summarizeCommits(commits);
      
      if (ticket === 'General') {
        descriptions.push(summary);
      } else {
        descriptions.push(`[${ticket}] ${summary}`);
      }
    }

    return descriptions.join('. ');
  }

  /**
   * Summarize a group of commits into a concise description
   */
  private static summarizeCommits(commits: ParsedCommit[]): string {
    // Extract key actions from commit messages
    const actions = commits.map(c => this.extractAction(c.message));
    
    // Combine similar actions
    const uniqueActions = [...new Set(actions)];
    
    // Format into a sentence
    if (uniqueActions.length === 1) {
      return uniqueActions[0];
    } else if (uniqueActions.length === 2) {
      return uniqueActions.join(' and ');
    } else {
      const last = uniqueActions.pop();
      return uniqueActions.join(', ') + ', and ' + last;
    }
  }

  /**
   * Extract the main action from a commit message
   */
  private static extractAction(message: string): string {
    // Remove ticket numbers
    let clean = message.replace(/[A-Z]+-\d+/g, '').trim();
    
    // Remove merge commit prefix
    clean = clean.replace(/^Merge pull request #\d+ from [\w-/]+\s*/i, '');
    
    // Remove branch names
    clean = clean.replace(/^Merge branch '[\w-/]+'/, '');
    
    // Capitalize first letter if needed
    if (clean.length > 0 && clean[0] !== clean[0].toUpperCase()) {
      clean = clean[0].toUpperCase() + clean.slice(1);
    }
    
    // Ensure it ends with proper punctuation context
    return clean || 'Code updates';
  }

  /**
   * Format commits list for display
   */
  static formatCommitsForDisplay(commits: ParsedCommit[]): string {
    return commits.map(c => `${c.hash} - ${c.message}`).join('\n');
  }
}




