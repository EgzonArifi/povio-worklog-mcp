import simpleGit, { SimpleGit, LogResult } from 'simple-git';
import { GitCommit, ParsedCommit } from '../types/index.js';
import { CommitParser } from './commitParser.js';

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
    
    // Use start of next day for exclusive comparison
    const endOfDay = new Date(date);
    endOfDay.setDate(endOfDay.getDate() + 1);
    endOfDay.setHours(0, 0, 0, 0);
    
    return this.getCommitsBetween(startOfDay, endOfDay);
  }

  /**
   * Compare two dates by date only (ignoring time and timezone)
   * Converts both dates to local date components for comparison
   * This handles the case where git returns UTC dates but we want to compare by local date
   * Returns: -1 if date1 < date2, 0 if equal, 1 if date1 > date2
   */
  private compareDatesByDateOnly(date1: Date, date2: Date): number {
    // Extract local date components from both dates
    // This ensures that a UTC date like "2025-11-19T23:00:00Z" (which is Nov 20 in some timezones)
    // is compared based on what day it represents in the local timezone
    const year1 = date1.getFullYear();
    const month1 = date1.getMonth();
    const day1 = date1.getDate();
    
    const year2 = date2.getFullYear();
    const month2 = date2.getMonth();
    const day2 = date2.getDate();
    
    // Compare year, month, day
    if (year1 < year2) return -1;
    if (year1 > year2) return 1;
    if (month1 < month2) return -1;
    if (month1 > month2) return 1;
    if (day1 < day2) return -1;
    if (day1 > day2) return 1;
    return 0;
  }

  /**
   * Get commits since a specific date (using author date, not commit date)
   */
  async getCommitsSince(since: Date): Promise<ParsedCommit[]> {
    try {
      // Get current user name and email to filter commits
      const userName = await this.git.raw(['config', 'user.name']);
      const userEmail = await this.git.raw(['config', 'user.email']);
      
      console.error('[DEBUG] getCommitsSince - Date:');
      console.error(`  Since: ${since.toISOString()} (local: ${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, '0')}-${String(since.getDate()).padStart(2, '0')})`);
      console.error(`[DEBUG] Git config - Name: "${userName.trim()}", Email: "${userEmail.trim()}"`);
      
      // Fetch commits from a wider range to account for merge delays and timezone issues
      // We'll filter by author date and author identity in code
      // Use a very wide range and rely on JavaScript filtering to avoid git date filtering issues
      const widerSince = new Date(since);
      widerSince.setDate(widerSince.getDate() - 30); // Look back 30 days to be safe
      
      console.error(`[DEBUG] Git query - --since: ${this.formatDateForGit(widerSince)} (${widerSince.toISOString()})`);
      
      // Don't use --until - fetch all commits since widerSince and filter by author date in JavaScript
      const log: LogResult = await this.git.log({
        '--since': this.formatDateForGit(widerSince),
        '--all': null,
        '--date': 'iso', // Git returns ISO format (UTC), we'll convert to local for comparison
      });

      console.error(`[DEBUG] Git returned ${log?.all?.length || 0} total commits`);

      // Handle empty log gracefully
      if (!log || !log.all || log.all.length === 0) {
        console.error('[DEBUG] No commits returned from git log');
        return [];
      }

      // Show sample of raw commits before filtering
      if (log.all.length > 0) {
        console.error(`[DEBUG] Sample raw commits (first 3):`);
        log.all.slice(0, 3).forEach(c => {
          console.error(`  - ${c.hash.substring(0, 7)}: ${c.message.substring(0, 50)}`);
          console.error(`    Author: ${c.author_name} <${c.author_email}>`);
          console.error(`    Date: ${c.date}`);
        });
      }

      const commits = this.parseCommits(log, userName.trim(), userEmail.trim());
      console.error(`[DEBUG] After author filtering: ${commits.length} commits`);
      
      // Filter by author date to ensure commits appear on the day they were authored
      // Use date-only comparison to handle timezone differences
      const filteredCommits = commits.filter(commit => {
        try {
          const commitDate = new Date(commit.date);
          const commitLocalDate = `${commitDate.getFullYear()}-${String(commitDate.getMonth() + 1).padStart(2, '0')}-${String(commitDate.getDate()).padStart(2, '0')}`;
          // Compare dates by date components only (year, month, day)
          const comparison = this.compareDatesByDateOnly(commitDate, since);
          const matches = comparison >= 0;
          
          if (!matches && commits.length <= 10) {
            // Log why commits are being filtered out (only if we have few commits to avoid spam)
            console.error(`[DEBUG] Commit ${commit.hash} filtered: date ${commitLocalDate}, comparison=${comparison}`);
          }
          
          return matches;
        } catch (error) {
          // If date parsing fails, exclude the commit
          console.error(`[DEBUG] Error parsing commit date: ${commit.date}`, error);
          return false;
        }
      });
      
      console.error(`[DEBUG] After date filtering: ${filteredCommits.length} commits`);
      if (filteredCommits.length > 0) {
        console.error(`[DEBUG] Final commits:`);
        filteredCommits.forEach(c => {
          const commitDate = new Date(c.date);
          const commitLocalDate = `${commitDate.getFullYear()}-${String(commitDate.getMonth() + 1).padStart(2, '0')}-${String(commitDate.getDate()).padStart(2, '0')}`;
          console.error(`  - ${c.hash}: ${c.message.substring(0, 50)} (date: ${commitLocalDate})`);
        });
      }
      
      return filteredCommits;
    } catch (error) {
      console.error('[DEBUG] Error in getCommitsSince:', error);
      if (error instanceof Error) {
        console.error('[DEBUG] Error stack:', error.stack);
      }
      // Return empty array on error rather than throwing
      return [];
    }
  }

  /**
   * Get commits between two dates (using author date, not commit date)
   * This prevents duplicates when PRs are merged on a different day than authored
   */
  async getCommitsBetween(from: Date, to: Date): Promise<ParsedCommit[]> {
    try {
      // Get current user name and email to filter commits
      const userName = await this.git.raw(['config', 'user.name']);
      const userEmail = await this.git.raw(['config', 'user.email']);
      
      console.error('[DEBUG] getCommitsBetween - Date range:');
      console.error(`  From: ${from.toISOString()} (local: ${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')})`);
      console.error(`  To: ${to.toISOString()} (local: ${to.getFullYear()}-${String(to.getMonth() + 1).padStart(2, '0')}-${String(to.getDate()).padStart(2, '0')})`);
      console.error(`[DEBUG] Git config - Name: "${userName.trim()}", Email: "${userEmail.trim()}"`);
      
      // Fetch commits from a wider range to account for merge delays and timezone issues
      // Git's --since/--until use commit date by default, so we fetch wider and filter by author date
      // We use a very wide range and rely on JavaScript filtering to avoid git date filtering issues
      const widerFrom = new Date(from);
      widerFrom.setDate(widerFrom.getDate() - 30); // Look back 30 days to be safe
      
      console.error(`[DEBUG] Git query - --since: ${this.formatDateForGit(widerFrom)} (${widerFrom.toISOString()})`);
      
      // Don't use --until at all - it can exclude commits due to timezone/date boundary issues
      // Instead, fetch all commits since widerFrom and filter by author date in JavaScript
      const log: LogResult = await this.git.log({
        '--since': this.formatDateForGit(widerFrom),
        '--all': null,
        '--date': 'iso', // Git returns ISO format (UTC), we'll convert to local for comparison
      });

      console.error(`[DEBUG] Git returned ${log?.all?.length || 0} total commits`);

      // Handle empty log gracefully
      if (!log || !log.all || log.all.length === 0) {
        console.error('[DEBUG] No commits returned from git log');
        return [];
      }

      // Show sample of raw commits before filtering
      if (log.all.length > 0) {
        console.error(`[DEBUG] Sample raw commits (first 3):`);
        log.all.slice(0, 3).forEach(c => {
          console.error(`  - ${c.hash.substring(0, 7)}: ${c.message.substring(0, 50)}`);
          console.error(`    Author: ${c.author_name} <${c.author_email}>`);
          console.error(`    Date: ${c.date}`);
        });
      }

      const commits = this.parseCommits(log, userName.trim(), userEmail.trim());
      console.error(`[DEBUG] After author filtering: ${commits.length} commits`);
      
      // Filter by author date to ensure commits appear on the day they were authored
      // This prevents showing commits on the day they were merged if authored earlier
      // Use date-only comparison to handle timezone differences
      const filteredCommits = commits.filter(commit => {
        try {
          const commitDate = new Date(commit.date);
          const commitLocalDate = `${commitDate.getFullYear()}-${String(commitDate.getMonth() + 1).padStart(2, '0')}-${String(commitDate.getDate()).padStart(2, '0')}`;
          // Compare dates by date components only (year, month, day)
          // For "between", we want commits >= from and < to (exclusive of 'to')
          const fromComparison = this.compareDatesByDateOnly(commitDate, from);
          const toComparison = this.compareDatesByDateOnly(commitDate, to);
          const matches = fromComparison >= 0 && toComparison < 0;
          
          if (!matches && commits.length <= 10) {
            // Log why commits are being filtered out (only if we have few commits to avoid spam)
            console.error(`[DEBUG] Commit ${commit.hash} filtered: date ${commitLocalDate}, fromComparison=${fromComparison}, toComparison=${toComparison}`);
          }
          
          return matches;
        } catch (error) {
          // If date parsing fails, exclude the commit
          console.error(`[DEBUG] Error parsing commit date: ${commit.date}`, error);
          return false;
        }
      });
      
      console.error(`[DEBUG] After date filtering: ${filteredCommits.length} commits`);
      if (filteredCommits.length > 0) {
        console.error(`[DEBUG] Final commits:`);
        filteredCommits.forEach(c => {
          const commitDate = new Date(c.date);
          const commitLocalDate = `${commitDate.getFullYear()}-${String(commitDate.getMonth() + 1).padStart(2, '0')}-${String(commitDate.getDate()).padStart(2, '0')}`;
          console.error(`  - ${c.hash}: ${c.message.substring(0, 50)} (date: ${commitLocalDate})`);
        });
      }
      
      return filteredCommits;
    } catch (error) {
      console.error('[DEBUG] Error in getCommitsBetween:', error);
      if (error instanceof Error) {
        console.error('[DEBUG] Error stack:', error.stack);
      }
      // Return empty array on error rather than throwing
      return [];
    }
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
   * Parse git log into structured commits, keeping only the current user's commits.
   * Filtering and deduplication live in the shared CommitParser.
   */
  private parseCommits(log: LogResult, userName: string, userEmail: string): ParsedCommit[] {
    return CommitParser.parse(
      log.all.map(c => ({
        hash: c.hash,
        message: c.message,
        body: c.body,
        date: c.date,
        author_name: c.author_name,
        author_email: c.author_email,
      })),
      { userName, userEmail }
    );
  }
}




