import { PovioWorklogRequest, PovioWorklogResponse, PovioProjectsResponse, PovioProject } from '../types/index.js';

export class PovioService {
  private apiToken: string;
  private apiUrl: string = 'https://app.povio.com/api/castro/professional/time_logs';
  private projectsUrl: string = 'https://app.povio.com/api/castro/professional/projects';

  constructor(apiToken?: string) {
    this.apiToken = apiToken || process.env.POVIO_API_TOKEN || '';
    
    if (!this.apiToken) {
      throw new Error('POVIO_API_TOKEN not configured. Set it in environment variables.');
    }
  }

  /**
   * Post worklog to Povio dashboard
   */
  async postWorklog(request: PovioWorklogRequest): Promise<PovioWorklogResponse> {
    try {
      // Calculate current week's date range (Sunday to Saturday)
      const startDate = this.getWeekStart(new Date(request.date));
      const endDate = this.getWeekEnd(new Date(request.date));
      
      // Build query string with required filters
      const queryString = new URLSearchParams({
        'filters[daterange_start]': startDate,
        'filters[daterange_end]': endDate,
        'filters[project_id]': '',
        'filters[group]': 'day'
      }).toString();

      // Build API payload
      const payload = {
        description: request.description,
        project_id: request.projectId,
        estimate: request.hours.toString(),
        end_date: request.date
      };

      const response = await fetch(`${this.apiUrl}?${queryString}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Cookie': this.apiToken,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(`Povio API error: ${response.status} ${response.statusText}\nResponse: ${responseText}`);
      }

      return {
        success: true,
        message: `✓ Worklog posted successfully!\nDate: ${request.date}\nHours: ${request.hours}\nProject ID: ${request.projectId}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `✗ Failed to post worklog: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get the start of the week (Sunday) for a given date
   */
  private getWeekStart(date: Date): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  }

  /**
   * Get the end of the week (Saturday) for a given date
   */
  private getWeekEnd(date: Date): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() + (6 - day);
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  }

  /**
   * Test connection to Povio API
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch('https://app.povio.com', {
        headers: {
          'Cookie': this.apiToken,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Fetch user's projects from Povio
   */
  async fetchProjects(tab: 'active' | 'archived' = 'active'): Promise<PovioProject[]> {
    try {
      const queryString = new URLSearchParams({
        'filters[tab]': tab,
        'page': '1',
        'per_page': '100',
        'filters[q]': ''
      }).toString();

      const response = await fetch(`${this.projectsUrl}?${queryString}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Cookie': this.apiToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as PovioProjectsResponse;
      
      // Flatten the grouped projects into a single array
      const projects: PovioProject[] = [];
      for (const group of data.records) {
        if (group.children) {
          projects.push(...group.children);
        }
      }

      return projects;
    } catch (error) {
      throw new Error(`Failed to fetch projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Resolve project name to project ID
   */
  async resolveProjectId(projectName: string): Promise<number> {
    const projects = await this.fetchProjects('active');
    
    // Try exact match first (case insensitive)
    const exactMatch = projects.find(p => 
      p.name.toLowerCase() === projectName.toLowerCase()
    );
    
    if (exactMatch) {
      return this.extractProjectId(exactMatch.path);
    }

    // Try partial match
    const partialMatch = projects.find(p => 
      p.name.toLowerCase().includes(projectName.toLowerCase())
    );

    if (partialMatch) {
      return this.extractProjectId(partialMatch.path);
    }

    throw new Error(`Project "${projectName}" not found. Use list_projects tool to see available projects.`);
  }

  /**
   * Extract project ID from path like "/professional/projects/2598"
   */
  private extractProjectId(path: string): number {
    const match = path.match(/\/professional\/projects\/(\d+)/);
    if (!match || !match[1]) {
      throw new Error(`Invalid project path: ${path}`);
    }
    return parseInt(match[1], 10);
  }
}




