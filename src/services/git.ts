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
   * Get commits for a specific date
   */
  async getCommitsForDate(date: Date): Promise<ParsedCommit[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return this.getCommitsBetween(startOfDay, endOfDay);
  }

  /**
   * Get commits since a specific date
   */
  async getCommitsSince(since: Date): Promise<ParsedCommit[]> {
    // Get current user name to filter commits (more reliable than email, works with GitHub CLI)
    const userName = await this.git.raw(['config', 'user.name']);
    
    const log: LogResult = await this.git.log({
      '--since': this.formatDateForGit(since),
      '--author': userName.trim(),
      '--all': null,
    });

    return this.parseCommits(log);
  }

  /**
   * Get commits between two dates
   */
  async getCommitsBetween(from: Date, to: Date): Promise<ParsedCommit[]> {
    // Get current user name to filter commits (more reliable than email, works with GitHub CLI)
    const userName = await this.git.raw(['config', 'user.name']);
    
    const log: LogResult = await this.git.log({
      '--since': this.formatDateForGit(from),
      '--until': this.formatDateForGit(to),
      '--author': userName.trim(),
      '--all': null,
    });

    return this.parseCommits(log);
  }

  /**
   * Format a Date object as a local time string for git
   * Returns format: "YYYY-MM-DD HH:MM:SS"
   * This ensures git interprets the date in local timezone, not UTC
   */
  private formatDateForGit(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * Parse git log into structured commits
   * Filters out stash commits and other non-relevant commits
   */
  private parseCommits(log: LogResult): ParsedCommit[] {
    return log.all
      .filter(commit => !this.isStashCommit(commit.message))
      .map(commit => ({
        hash: commit.hash.substring(0, 7),
        message: commit.message,
        date: commit.date,
        author: commit.author_name,
        ticketNumber: this.extractTicketNumber(commit.message),
        type: this.determineCommitType(commit.message),
      }));
  }

  /**
   * Check if a commit is a git stash entry
   */
  private isStashCommit(message: string): boolean {
    const stashPatterns = [
      /^WIP on /i,
      /^index on /i,
      /^On \w+:/i,
    ];
    
    return stashPatterns.some(pattern => pattern.test(message));
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




