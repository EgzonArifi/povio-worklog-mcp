import { PovioService } from '../services/povio.js';

export async function listProjects() {
  const povioService = new PovioService();
  
  try {
    // Fetch projects with correct worklog IDs
    const availableProjects = await povioService.fetchAvailableProjects();
    
    if (!availableProjects || availableProjects.length === 0) {
      return {
        message: 'No active projects found.',
        projects: [],
        summary: 'No projects available.'
      };
    }

    // Format project list for display with correct worklog IDs
    const projectList = availableProjects
      .filter(p => p && p.name && typeof p.id === 'number')
      .map(p => ({
        name: p.name,
        id: p.id.toString(),
      }));

    if (projectList.length === 0) {
      return {
        message: 'No valid projects found.',
        projects: [],
        summary: 'Projects data is invalid or empty.'
      };
    }

    return {
      message: `Found ${projectList.length} active project(s):`,
      projects: projectList,
      summary: projectList.map(p => `• ${p.name} - ID: ${p.id}`).join('\n'),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in listProjects:', errorMessage, error);
    throw new Error(`Failed to list projects: ${errorMessage}`);
  }
}

