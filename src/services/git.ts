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
   * Get commits since a specific date (using author date, not commit date)
   */
  async getCommitsSince(since: Date): Promise<ParsedCommit[]> {
    // Get current user name and email to filter commits
    const userName = await this.git.raw(['config', 'user.name']);
    const userEmail = await this.git.raw(['config', 'user.email']);
    
    // Fetch commits from a wider range to account for merge delays
    // We'll filter by author date and author identity in code
    const widerSince = new Date(since);
    widerSince.setDate(widerSince.getDate() - 7); // Look back 7 extra days
    
    const log: LogResult = await this.git.log({
      '--since': this.formatDateForGit(widerSince),
      '--all': null,
      '--date': 'iso', // Explicitly request ISO format for consistent parsing
    });

    const commits = this.parseCommits(log, userName.trim(), userEmail.trim());
    
    // Filter by author date to ensure commits appear on the day they were authored
    return commits.filter(commit => {
      const commitDate = new Date(commit.date);
      return commitDate >= since;
    });
  }

  /**
   * Get commits between two dates (using author date, not commit date)
   * This prevents duplicates when PRs are merged on a different day than authored
   */
  async getCommitsBetween(from: Date, to: Date): Promise<ParsedCommit[]> {
    // Get current user name and email to filter commits
    const userName = await this.git.raw(['config', 'user.name']);
    const userEmail = await this.git.raw(['config', 'user.email']);
    
    // Fetch commits from a wider range to account for merge delays
    // Git's --since/--until use commit date by default, so we fetch wider and filter by author date
    const widerFrom = new Date(from);
    widerFrom.setDate(widerFrom.getDate() - 7); // Look back 7 extra days
    
    const widerTo = new Date(to);
    widerTo.setDate(widerTo.getDate() + 1); // Look ahead 1 extra day
    
    const log: LogResult = await this.git.log({
      '--since': this.formatDateForGit(widerFrom),
      '--until': this.formatDateForGit(widerTo),
      '--all': null,
      '--date': 'iso', // Explicitly request ISO format for consistent parsing
    });

    const commits = this.parseCommits(log, userName.trim(), userEmail.trim());
    
    // Filter by author date to ensure commits appear on the day they were authored
    // This prevents showing commits on the day they were merged if authored earlier
    return commits.filter(commit => {
      const commitDate = new Date(commit.date);
      return commitDate >= from && commitDate < to;
    });
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
   * Filters out stash commits, and conditionally filters merge commits
   * Merge commits are excluded only if their merged commits are already in the list
   * Also removes duplicates caused by rebasing/squashing
   * Filters commits by author name or email to only include user's commits
   */
  private parseCommits(log: LogResult, userName: string, userEmail: string): ParsedCommit[] {
    // First, parse all commits including merges, filtering by author
    const allCommits = log.all
      .filter(commit => !this.isStashCommit(commit.message))
      .filter(commit => this.isAuthorMatch(commit.author_name, commit.author_email, userName, userEmail))
      .map(commit => ({
        hash: commit.hash.substring(0, 7),
        message: commit.message,
        body: commit.body || undefined, // Include commit body if present
        date: commit.date,
        author: commit.author_name,
        ticketNumber: this.extractTicketNumber(commit.message),
        type: this.determineCommitType(commit.message),
        isMerge: this.isMergeCommit(commit.message),
      }));

    // Separate merge commits from regular commits
    const mergeCommits = allCommits.filter(c => c.isMerge);
    const regularCommits = allCommits
      .filter(c => !c.isMerge)
      .map(({ isMerge, ...rest }) => rest); // Remove isMerge property

    // Remove isMerge property before returning
    const commitsWithoutMergeFlag = allCommits.map(({ isMerge, ...rest }) => rest);

    // Filter merge commits: exclude only if their merged commits are already present
    const filteredCommits = commitsWithoutMergeFlag.filter(commit => {
      if (!this.isMergeCommit(commit.message)) {
        return true; // Keep all non-merge commits
      }

      // For merge commits, check if merged commits are already in the list
      return this.shouldIncludeMergeCommit(commit, regularCommits);
    });

    // Remove duplicates caused by rebasing/squashing
    return this.deduplicateCommits(filteredCommits);
  }

  /**
   * Check if a commit author matches the current user
   * Matches by either name or email (case-insensitive)
   * Handles email variations (with/without angle brackets, different casing)
   */
  private isAuthorMatch(
    commitAuthorName: string,
    commitAuthorEmail: string,
    userName: string,
    userEmail: string
  ): boolean {
    // Normalize and compare names
    const normalizedCommitName = commitAuthorName.toLowerCase().trim();
    const normalizedUserName = userName.toLowerCase().trim();
    const nameMatch = normalizedCommitName === normalizedUserName;
    
    // Normalize emails - remove angle brackets if present, lowercase, trim
    const normalizeEmail = (email: string): string => {
      return email.toLowerCase().trim().replace(/^<|>$/g, '');
    };
    
    const normalizedCommitEmail = normalizeEmail(commitAuthorEmail);
    const normalizedUserEmail = normalizeEmail(userEmail);
    const emailMatch = normalizedCommitEmail === normalizedUserEmail;
    
    // Extract username part from any email (before @)
    const extractUsernameFromEmail = (email: string): string | null => {
      const match = email.match(/^([^@]+)@/);
      return match ? match[1].toLowerCase() : null;
    };
    
    // For GitHub no-reply emails, extract the username part and compare
    // e.g., "EgzonArifi@users.noreply.github.com" -> "egzonarifi"
    const extractGitHubUsername = (email: string): string | null => {
      const match = email.match(/^([^@]+)@users\.noreply\.github\.com$/);
      return match ? match[1].toLowerCase() : null;
    };
    
    const commitEmailUsername = extractUsernameFromEmail(normalizedCommitEmail);
    const userEmailUsername = extractUsernameFromEmail(normalizedUserEmail);
    const commitGitHubUsername = extractGitHubUsername(normalizedCommitEmail);
    
    // Match if GitHub usernames match
    const userGitHubUsername = extractGitHubUsername(normalizedUserEmail);
    const githubUsernameMatch = commitGitHubUsername && userGitHubUsername && 
                                commitGitHubUsername === userGitHubUsername;
    
    // Normalize strings for comparison (remove spaces and special chars)
    const normalizeForComparison = (str: string): string => {
      return str.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    };
    
    // Check if username from commit email matches git config name
    const commitUsernameMatchesName = commitEmailUsername !== null && 
                                      normalizeForComparison(commitEmailUsername) === normalizeForComparison(normalizedUserName);
    
    // Check if GitHub username from commit email matches git config name
    const commitGitHubUsernameMatchesName = commitGitHubUsername !== null && 
                                           normalizeForComparison(commitGitHubUsername) === normalizeForComparison(normalizedUserName);
    
    // Also check if any part of the name matches the email username
    const namePartsMatch = commitEmailUsername !== null && 
                          normalizedUserName.split(/\s+/).some(part => 
                            normalizeForComparison(part) === normalizeForComparison(commitEmailUsername)
                          );
    
    return nameMatch || emailMatch || githubUsernameMatch || commitUsernameMatchesName || 
           commitGitHubUsernameMatchesName || namePartsMatch;
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
   * Check if a commit is a merge commit
   * Merge commits don't represent actual work, so we exclude them
   * Note: Squash merges (commits ending with (#PR_NUMBER)) are NOT considered merge commits
   * as they represent the actual work, not merge metadata
   */
  private isMergeCommit(message: string): boolean {
    const mergePatterns = [
      /^Merge pull request #\d+/i,
      /^Merge branch /i,
      /^Merge remote-tracking branch /i,
      /^Merge\s+'\S+'\s+into\s+/i,
      /^Merged in /i,
      /^\(Merged by /i,
    ];
    
    return mergePatterns.some(pattern => pattern.test(message));
  }

  /**
   * Extract PR number from a commit message
   * Returns the PR number if found, null otherwise
   */
  private extractPRNumber(message: string): string | null {
    // Match "Merge pull request #123" or "...#123)" at the end
    const match = message.match(/#(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Determine if a merge commit should be included in the worklog
   * Merge commits are included only if the commits they merge are NOT already in the list
   * This handles the case where a PR branch is deleted after merging
   */
  private shouldIncludeMergeCommit(
    mergeCommit: ParsedCommit,
    regularCommits: ParsedCommit[]
  ): boolean {
    // Extract PR number from merge commit
    const prNumber = this.extractPRNumber(mergeCommit.message);
    
    if (!prNumber) {
      // For merge commits without PR numbers, be conservative and include them
      // This handles edge cases where we can't determine if merged commits exist
      return true;
    }

    // Check if there are any regular commits with the same PR number
    // Only exclude if there are commits from the same date (to avoid false matches)
    const mergeCommitDate = new Date(mergeCommit.date).toDateString();
    const hasCommitsWithSamePR = regularCommits.some(commit => {
      const commitPRNumber = this.extractPRNumber(commit.message);
      if (commitPRNumber !== prNumber) {
        return false;
      }
      // Only consider it a match if the commit is from the same date
      // This prevents excluding merge commits when there are unrelated commits with the same PR number
      const commitDate = new Date(commit.date).toDateString();
      return commitDate === mergeCommitDate;
    });

    // Include merge commit only if merged commits are NOT already present on the same date
    // This is more lenient - we only exclude if we're confident the work is already represented
    return !hasCommitsWithSamePR;
  }

  /**
   * Normalize commit message for comparison
   * Removes PR numbers, extra whitespace, and other variations
   */
  private normalizeCommitMessage(message: string): string {
    return message
      .toLowerCase()
      .trim()
      // Remove PR numbers like (#123)
      .replace(/\(#\d+\)/g, '')
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Remove duplicate commits that have the same message but different hashes
   * This happens when commits are rebased or squashed
   * Keeps the version with PR number if available, otherwise keeps the first one
   */
  private deduplicateCommits(commits: ParsedCommit[]): ParsedCommit[] {
    const seen = new Map<string, ParsedCommit>();

    for (const commit of commits) {
      const normalized = this.normalizeCommitMessage(commit.message);
      const existing = seen.get(normalized);

      if (!existing) {
        // First time seeing this message
        seen.set(normalized, commit);
      } else {
        // Duplicate found - keep the one with PR number if available
        const commitHasPRNumber = /\(#\d+\)/.test(commit.message);
        const existingHasPRNumber = /\(#\d+\)/.test(existing.message);

        if (commitHasPRNumber && !existingHasPRNumber) {
          // Replace with the version that has PR number
          seen.set(normalized, commit);
        }
        // Otherwise keep the existing one (first occurrence or the one with PR number)
      }
    }

    return Array.from(seen.values());
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




