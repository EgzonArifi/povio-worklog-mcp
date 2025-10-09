import { GitService } from '../services/git.js';
import { WorklogFormatter } from '../services/formatter.js';
import { GenerateWorklogArgs, WorklogData } from '../types/index.js';

export async function generateWorklog(args: GenerateWorklogArgs): Promise<WorklogData> {
  const gitService = new GitService(args.repository);
  
  // Get commits based on timeframe
  const commits = args.timeframe === 'today' 
    ? await gitService.getTodayCommits()
    : await gitService.getYesterdayCommits();
  
  // Determine the date
  const date = args.timeframe === 'today'
    ? new Date().toISOString().split('T')[0]
    : new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  // Format into worklog
  const worklog = WorklogFormatter.formatWorklog(commits, date);
  
  return worklog;
}




