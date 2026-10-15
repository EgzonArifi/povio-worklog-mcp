import { execFile } from 'child_process';
import { promisify } from 'util';
import { ParsedCommit } from '../types/index.js';
import { CommitParser, RawCommit } from './commitParser.js';

const execFileAsync = promisify(execFile);

const PER_PAGE = 100;
const MAX_PAGES = 10;

export interface GitHubCommitResult {
  repo: string;
  commits: Array<ParsedCommit & { branches: string[] }>;
  branchesChecked: string[];
  apiCalls: number;
}

interface GitHubBranch {
  name: string;
  commit: { sha: string };
}

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; email: string; date: string };
    committer: { date: string };
  };
}

/**
 * Reads a user's commits from GitHub without cloning, via `gh api`.
 * In Claude cloud routines `gh` is authenticated by the session proxy for repos
 * added with `add_repo`; locally it uses the developer's own `gh auth login`.
 */
export class GitHubService {
  private apiCalls = 0;
  private login: string | undefined;

  constructor(login?: string) {
    this.login = login || process.env.WORKLOG_GITHUB_USER || undefined;
  }

  /**
   * Resolve the GitHub login used as the commit author filter.
   */
  async getLogin(): Promise<string> {
    if (!this.login) {
      const user = await this.api<{ login: string }>('user');
      this.login = user.login;
    }
    return this.login;
  }

  /**
   * Get the user's commits in `owner/name` that were authored between `from`
   * (inclusive) and `to` (exclusive) on the default branch and on every branch
   * updated since `from`. Dates are compared by local calendar day, like the
   * local git source, so set TZ (e.g. via WORKLOG_TIMEZONE) before calling.
   */
  async getCommitsBetween(repo: string, from: Date, to: Date): Promise<GitHubCommitResult> {
    this.apiCalls = 0;
    const login = await this.getLogin();

    // GitHub filters on committer date; widen the window and filter by author date below
    const widerFrom = new Date(from);
    widerFrom.setDate(widerFrom.getDate() - 1);
    const widerTo = new Date(to);
    widerTo.setDate(widerTo.getDate() + 1);

    const repoInfo = await this.api<{ default_branch: string }>(`repos/${repo}`);
    const branches = await this.listBranches(repo);

    // Branches whose head commit is older than the window cannot contain commits from it
    const candidates = await this.filterRecentBranches(repo, branches, widerFrom, repoInfo.default_branch);

    const bySha = new Map<string, { raw: RawCommit; branches: string[] }>();
    for (const branch of candidates) {
      const commits = await this.listCommits(repo, branch, login, widerFrom, widerTo);
      for (const c of commits) {
        const existing = bySha.get(c.sha);
        if (existing) {
          existing.branches.push(branch);
          continue;
        }
        const [subject, ...rest] = c.commit.message.split('\n');
        bySha.set(c.sha, {
          raw: {
            hash: c.sha,
            message: subject,
            body: rest.join('\n').trim() || undefined,
            date: c.commit.author.date,
            author_name: c.commit.author.name,
            author_email: c.commit.author.email,
          },
          branches: [branch],
        });
      }
    }

    // The API already filtered by author, so no author filter here
    const parsed = CommitParser.parse([...bySha.values()].map(v => v.raw));

    const branchesByHash = new Map<string, string[]>();
    for (const [sha, v] of bySha) {
      branchesByHash.set(sha.substring(0, 7), v.branches);
    }

    const inDay = parsed.filter(c => {
      const d = new Date(c.date);
      return d.getTime() >= from.getTime() && d.getTime() < to.getTime();
    });

    return {
      repo,
      commits: inDay.map(c => ({ ...c, branches: branchesByHash.get(c.hash) ?? [] })),
      branchesChecked: candidates,
      apiCalls: this.apiCalls,
    };
  }

  private async listBranches(repo: string): Promise<GitHubBranch[]> {
    const all: GitHubBranch[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const batch = await this.api<GitHubBranch[]>(`repos/${repo}/branches?per_page=${PER_PAGE}&page=${page}`);
      all.push(...batch);
      if (batch.length < PER_PAGE) break;
    }
    return all;
  }

  private async filterRecentBranches(
    repo: string,
    branches: GitHubBranch[],
    since: Date,
    defaultBranch: string
  ): Promise<string[]> {
    const names = new Set<string>([defaultBranch]);
    for (const branch of branches) {
      if (names.has(branch.name)) continue;
      const head = await this.api<GitHubCommit>(`repos/${repo}/commits/${branch.commit.sha}`);
      if (new Date(head.commit.committer.date).getTime() >= since.getTime()) {
        names.add(branch.name);
      }
    }
    return [...names];
  }

  private async listCommits(
    repo: string,
    branch: string,
    login: string,
    since: Date,
    until: Date
  ): Promise<GitHubCommit[]> {
    const all: GitHubCommit[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const params = new URLSearchParams({
        sha: branch,
        author: login,
        since: since.toISOString(),
        until: until.toISOString(),
        per_page: String(PER_PAGE),
        page: String(page),
      });
      const batch = await this.api<GitHubCommit[]>(`repos/${repo}/commits?${params.toString()}`);
      all.push(...batch);
      if (batch.length < PER_PAGE) break;
    }
    return all;
  }

  /**
   * Call the GitHub REST API through the `gh` CLI. gh handles authentication
   * (the cloud session proxy or the developer's login), so no token is read here.
   */
  private async api<T>(path: string): Promise<T> {
    this.apiCalls++;
    try {
      const { stdout } = await execFileAsync('gh', ['api', path], { maxBuffer: 32 * 1024 * 1024 });
      return JSON.parse(stdout) as T;
    } catch (error) {
      const err = error as NodeJS.ErrnoException & { stderr?: string };
      if (err.code === 'ENOENT') {
        throw new Error('GitHub CLI (gh) not found. Install it from https://cli.github.com and run `gh auth login`.');
      }
      const detail = (err.stderr || err.message || '').toString().trim().split('\n')[0];
      throw new Error(`GitHub API request failed for ${path.split('?')[0]}: ${detail}`);
    }
  }
}
