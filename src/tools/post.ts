import { PovioService } from '../services/povio.js';
import { PostWorklogArgs, PovioWorklogResponse } from '../types/index.js';

export async function postWorklog(args: PostWorklogArgs): Promise<PovioWorklogResponse> {
  const povioService = new PovioService();
  
  let projectId: number;

  // Resolve project name to ID if provided
  if (args.projectName) {
    try {
      projectId = await povioService.resolveProjectId(args.projectName);
    } catch (error) {
      return {
        success: false,
        message: `✗ Error: ${error instanceof Error ? error.message : 'Failed to resolve project name'}`,
      };
    }
  } else {
    // Use provided projectId or fall back to DEFAULT_PROJECT_ID from environment
    projectId = args.projectId ?? parseInt(process.env.DEFAULT_PROJECT_ID || '0');
  }
  
  if (!projectId) {
    return {
      success: false,
      message: '✗ Error: No project ID or name provided and DEFAULT_PROJECT_ID not set in environment',
    };
  }
  
  const result = await povioService.postWorklog({
    description: args.description,
    projectId: projectId,
    hours: args.hours,
    date: args.date,
  });
  
  return result;
}




