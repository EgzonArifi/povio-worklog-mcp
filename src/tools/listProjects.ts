import { PovioService } from '../services/povio.js';

export async function listProjects() {
  const povioService = new PovioService();
  
  try {
    // Fetch projects with correct worklog IDs
    const availableProjects = await povioService.fetchAvailableProjects();
    
    if (availableProjects.length === 0) {
      return {
        message: 'No active projects found.',
        projects: [],
      };
    }

    // Format project list for display with correct worklog IDs
    const projectList = availableProjects.map(p => ({
      name: p.text,
      id: p.value.toString(),
    }));

    return {
      message: `Found ${projectList.length} active project(s):`,
      projects: projectList,
      summary: projectList.map(p => `• ${p.name} - ID: ${p.id}`).join('\n'),
    };
  } catch (error) {
    throw new Error(`Failed to list projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

