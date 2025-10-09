import { PovioService } from '../services/povio.js';
import { PostWorklogArgs, PovioWorklogResponse } from '../types/index.js';

export async function postWorklog(args: PostWorklogArgs): Promise<PovioWorklogResponse> {
  const povioService = new PovioService();
  
  // Use provided projectId or fall back to DEFAULT_PROJECT_ID from environment
  const projectId = args.projectId ?? parseInt(process.env.DEFAULT_PROJECT_ID || '0');
  
  if (!projectId) {
    return {
      success: false,
      message: '✗ Error: No project ID provided and DEFAULT_PROJECT_ID not set in environment',
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




