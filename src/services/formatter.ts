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
    
    // Remove duplicates while preserving order
    const uniqueActions = [...new Set(actions)];
    
    // Format into a sentence with proper capitalization
    if (uniqueActions.length === 1) {
      return this.capitalizeFirst(uniqueActions[0]);
    } else if (uniqueActions.length === 2) {
      return this.capitalizeFirst(uniqueActions[0]) + ' and ' + this.lowercaseFirst(uniqueActions[1]);
    } else {
      const formattedActions = uniqueActions.map((action, index) => {
        if (index === 0) return this.capitalizeFirst(action);
        return this.lowercaseFirst(action);
      });
      const last = formattedActions.pop();
      return formattedActions.join(', ') + ', and ' + last;
    }
  }

  /**
   * Capitalize first letter of a string
   */
  private static capitalizeFirst(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Lowercase first letter of a string (for continuation in sentences)
   */
  private static lowercaseFirst(str: string): string {
    if (!str) return str;
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  /**
   * Extract the main action from a commit message
   * Creates client-appropriate descriptions following Povio guidelines
   */
  private static extractAction(message: string): string {
    // Remove ticket numbers (e.g., ENG-160, [ENG-160])
    let clean = message.replace(/\[?[A-Z]+-\d+\]?:?/g, '').trim();
    
    // Remove merge commit prefix and extract meaningful description
    const mergeMatch = clean.match(/^Merge pull request #\d+ from [\w-/]+\s*(.+)/i);
    if (mergeMatch && mergeMatch[1]) {
      clean = mergeMatch[1].trim();
    } else {
      clean = clean.replace(/^Merge pull request #\d+ from [\w-/]+\s*/i, '');
    }
    
    // Remove PR numbers like (#3), (#123)
    clean = clean.replace(/\s*\(#\d+\)\s*$/, '').trim();
    
    // Remove branch names
    clean = clean.replace(/^Merge branch '[\w-/]+'/, '');
    clean = clean.replace(/^\[[\w-]+\]\s*/, ''); // Remove [branch-name] prefix
    
    // Remove conventional commit prefixes for client-facing description
    clean = clean.replace(/^(feat|fix|docs|style|refactor|test|chore):\s*/i, '');
    
    // Remove colons and dashes at the start
    clean = clean.replace(/^[:;\-\s]+/, '').trim();
    
    // Ensure meaningful description with proper capitalization
    if (clean.length > 0) {
      // Only capitalize if first letter is lowercase
      if (clean[0] !== clean[0].toUpperCase()) {
        clean = clean[0].toUpperCase() + clean.slice(1);
      }
    }
    
    // Ensure meaningful description
    return clean || 'Development work';
  }

  /**
   * Format commits list for display
   */
  static formatCommitsForDisplay(commits: ParsedCommit[]): string {
    return commits.map(c => `${c.hash} - ${c.message}`).join('\n');
  }
}




