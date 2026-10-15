import { ParsedCommit } from '../types/index.js';

/**
 * A commit as returned by any source (local git log or the GitHub API),
 * before filtering and enrichment.
 */
export interface RawCommit {
  hash: string;
  message: string;
  body?: string;
  date: string;
  author_name: string;
  author_email: string;
}

export interface AuthorFilter {
  userName: string;
  userEmail: string;
}

/**
 * Turns raw commits into worklog-ready commits: drops stash entries, optionally
 * keeps only the user's own commits, filters redundant merge commits and removes
 * rebase/squash duplicates. Shared by the local git source and the GitHub source.
 */
export class CommitParser {
  /**
   * Parse raw commits into structured commits.
   * Merge commits are excluded only if their merged commits are already in the list.
   * Pass `author` to keep only commits matching that identity; omit it when the
   * source already filtered by author (e.g. the GitHub API `author` parameter).
   */
  static parse(commits: RawCommit[], author?: AuthorFilter): ParsedCommit[] {
    // First, parse all commits including merges, filtering by author
    const allCommits = commits
      .filter(commit => !this.isStashCommit(commit.message))
      .filter(commit =>
        !author || this.isAuthorMatch(commit.author_name, commit.author_email, author.userName, author.userEmail)
      )
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
  private static isAuthorMatch(
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
  private static isStashCommit(message: string): boolean {
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
  private static isMergeCommit(message: string): boolean {
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
  private static extractPRNumber(message: string): string | null {
    // Match "Merge pull request #123" or "...#123)" at the end
    const match = message.match(/#(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Determine if a merge commit should be included in the worklog
   * Merge commits are included only if the commits they merge are NOT already in the list
   * This handles the case where a PR branch is deleted after merging
   */
  private static shouldIncludeMergeCommit(
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
  private static normalizeCommitMessage(message: string): string {
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
  private static deduplicateCommits(commits: ParsedCommit[]): ParsedCommit[] {
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
  private static extractTicketNumber(message: string): string | null {
    const match = message.match(/([A-Z]+-\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Determine commit type from message
   */
  private static determineCommitType(message: string): 'feature' | 'fix' | 'refactor' | 'other' {
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
