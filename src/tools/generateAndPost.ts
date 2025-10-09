import { generateWorklog } from './generate.js';
import { postWorklog } from './post.js';
import { GenerateAndPostArgs } from '../types/index.js';

export async function generateAndPostWorklog(args: GenerateAndPostArgs) {
  // Step 1: Generate worklog from git commits
  const worklog = await generateWorklog({
    timeframe: args.timeframe,
    repository: args.repository,
  });
  
  // Step 2: Post to Povio
  const postResult = await postWorklog({
    description: worklog.description,
    projectId: args.projectId,
    hours: args.hours,
    date: worklog.date,
  });
  
  // Step 3: Return combined result
  return {
    generated: worklog,
    posted: postResult,
    summary: postResult.success 
      ? `✓ Worklog generated and posted successfully!\n\nDate: ${worklog.date}\nDescription: ${worklog.description}\nHours: ${args.hours}\nProject ID: ${args.projectId}\n\nCommits analyzed:\n${worklog.commits.join('\n')}`
      : `✓ Worklog generated, but posting failed.\n\nGenerated worklog:\nDate: ${worklog.date}\nDescription: ${worklog.description}\n\nError: ${postResult.message}`,
  };
}




