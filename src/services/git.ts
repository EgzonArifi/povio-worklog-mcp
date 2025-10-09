import simpleGit, { SimpleGit, LogResult } from 'simple-git';
import { GitCommit, ParsedCommit } from '../types/index.js';

export class GitService {
  private git: SimpleGit;

  constructor(repositoryPath?: string) {
    this.git = simpleGit(repositoryPath || process.cwd());
  }

  /**
   * Get commits for today
   */
  async getTodayCommits(): Promise<ParsedCommit[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.getCommitsSince(today);
  }

  /**
   * Get commits for yesterday
   */
  async getYesterdayCommits(): Promise<ParsedCommit[]> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return this.getCommitsBetween(yesterday, today);
  }

  /**
   * Get commits since a specific date
   */
  async getCommitsSince(since: Date): Promise<ParsedCommit[]> {
    // Get current user email to filter commits
    const userEmail = await this.git.raw(['config', 'user.email']);
    
    const log: LogResult = await this.git.log({
      '--since': since.toISOString(),
      '--author': userEmail.trim(),
      '--all': null,
    });

    return this.parseCommits(log);
  }

  /**
   * Get commits between two dates
   */
  async getCommitsBetween(from: Date, to: Date): Promise<ParsedCommit[]> {
    // Get current user email to filter commits
    const userEmail = await this.git.raw(['config', 'user.email']);
    
    const log: LogResult = await this.git.log({
      '--since': from.toISOString(),
      '--until': to.toISOString(),
      '--author': userEmail.trim(),
      '--all': null,
    });

    return this.parseCommits(log);
  }

  /**
   * Parse git log into structured commits
   */
  private parseCommits(log: LogResult): ParsedCommit[] {
    return log.all.map(commit => ({
      hash: commit.hash.substring(0, 7),
      message: commit.message,
      date: commit.date,
      author: commit.author_name,
      ticketNumber: this.extractTicketNumber(commit.message),
      type: this.determineCommitType(commit.message),
    }));
  }

  /**
   * Extract ticket number from commit message (e.g., ENG-155, WAY-204)
   */
  private extractTicketNumber(message: string): string | null {
    const match = message.match(/([A-Z]+-\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Determine commit type from message
   */
  private determineCommitType(message: string): 'feature' | 'fix' | 'refactor' | 'other' {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('fix') || lowerMessage.includes('bug')) {
      return 'fix';
    }
    if (lowerMessage.includes('refactor') || lowerMessage.includes('cleanup')) {
      return 'refactor';
    }
    if (lowerMessage.includes('feature') || lowerMessage.includes('implement') || lowerMessage.includes('add')) {
      return 'feature';
    }
    
    return 'other';
  }
}




