import { PovioService } from '../services/povio.js';

export async function listProjects() {
  const povioService = new PovioService();
  
  try {
    const projects = await povioService.fetchProjects('active');
    
    if (projects.length === 0) {
      return {
        message: 'No active projects found.',
        projects: [],
      };
    }

    // Helper to extract project ID from path
    const extractId = (path: string): string => {
      const match = path.match(/\/professional\/projects\/(\d+)/);
      return match && match[1] ? match[1] : 'N/A';
    };

    // Format project list for display
    const projectList = projects.map(p => ({
      name: p.name,
      roles: p.roles.join(', '),
      id: extractId(p.path),
    }));

    return {
      message: `Found ${projects.length} active project(s):`,
      projects: projectList,
      summary: projectList.map(p => `• ${p.name} - ID: ${p.id} (${p.roles})`).join('\n'),
    };
  } catch (error) {
    throw new Error(`Failed to list projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

