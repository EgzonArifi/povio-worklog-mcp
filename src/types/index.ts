export interface GitCommit {
  hash: string;
  message: string;
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
  projectId?: number;
  hours?: number;
  rawCommits?: ParsedCommit[];
  aiEnhancementPrompt?: string;
}

export interface PovioWorklogRequest {
  description: string;
  projectId: number;
  hours: number;
  date: string;
}

export interface PovioWorklogResponse {
  success: boolean;
  id?: string;
  message: string;
}

export interface GenerateWorklogArgs {
  timeframe: 'today' | 'yesterday';
  repository?: string;
  enhanceWithAI?: boolean;
}

export interface PostWorklogArgs {
  description: string;
  projectId?: number;
  hours: number;
  date: string;
}

export interface GenerateAndPostArgs {
  timeframe: 'today' | 'yesterday';
  projectId?: number;
  hours: number;
  repository?: string;
  enhanceWithAI?: boolean;
}




