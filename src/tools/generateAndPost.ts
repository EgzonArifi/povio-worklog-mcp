import { generateWorklog } from './generate.js';
import { postWorklog } from './post.js';
import { GenerateAndPostArgs } from '../types/index.js';

export async function generateAndPostWorklog(args: GenerateAndPostArgs) {
  // Step 1: Generate worklog from git commits
  const worklog = await generateWorklog({
    timeframe: args.timeframe,
    repository: args.repository,
    enhanceWithAI: args.enhanceWithAI,
  });
  
  // Determine project ID or name
  const projectId = args.projectId ?? parseInt(process.env.DEFAULT_PROJECT_ID || '0');
  const projectName = args.projectName;
  
  // AI enhancement is enabled by default (can be disabled with enhanceWithAI: false)
  // If AI enhancement is active, don't post yet - return worklog for AI to enhance
  const shouldEnhance = args.enhanceWithAI !== false;
  
  if (shouldEnhance) {
    return {
      generated: worklog,
      posted: { success: false, message: 'Waiting for AI-enhanced description' },
      summary: `Worklog generated. Waiting for AI to create enhanced description before posting.`,
    };
  }
  
  // Step 2: Post to Povio
  const postResult = await postWorklog({
    description: worklog.description,
    projectId: projectId,
    projectName: projectName,
    hours: args.hours,
    date: worklog.date,
  });
  
  // Step 3: Return combined result
  return {
    generated: worklog,
    posted: postResult,
    summary: postResult.success 
      ? `✓ Worklog generated and posted successfully!\n\nDate: ${worklog.date}\nDescription: ${worklog.description}\nHours: ${args.hours}\nProject: ${projectName || projectId}\n\nCommits analyzed:\n${worklog.commits.join('\n')}`
      : `✓ Worklog generated, but posting failed.\n\nGenerated worklog:\nDate: ${worklog.date}\nDescription: ${worklog.description}\n\nError: ${postResult.message}`,
  };
}




