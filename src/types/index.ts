export interface GitCommit {
  hash: string;
  message: string;
  body?: string; // Commit description/body (optional)
  date: string;
  author: string;
}

export interface ParsedCommit extends GitCommit {
  ticketNumber: string | null;
  type: 'feature' | 'fix' | 'refactor' | 'other';
}

export interface WorklogData {
  date: string;
  description: string;
  commits: string[];
  ticketNumbers: string[];
  rawCommits?: ParsedCommit[];
  aiEnhancementPrompt?: string;
}

export interface GenerateWorklogArgs {
  timeframe: string; // "today", "yesterday", or specific date like "2024-10-11"
  repository?: string;
  enhanceWithAI?: boolean;
  project?: string; // Povio project name, only used in the posting instructions
  hours?: number; // only used in the posting instructions
}




