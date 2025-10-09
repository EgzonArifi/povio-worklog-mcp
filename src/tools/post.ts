import { PovioService } from '../services/povio.js';
import { PostWorklogArgs, PovioWorklogResponse } from '../types/index.js';

export async function postWorklog(args: PostWorklogArgs): Promise<PovioWorklogResponse> {
  const povioService = new PovioService();
  
  const result = await povioService.postWorklog({
    description: args.description,
    projectId: args.projectId,
    hours: args.hours,
    date: args.date,
  });
  
  return result;
}




