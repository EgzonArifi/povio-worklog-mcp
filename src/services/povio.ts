import { PovioWorklogRequest, PovioWorklogResponse, PovioProjectsResponse, PovioProject, PovioAvailableProject } from '../types/index.js';

export class PovioService {
  private apiToken: string;
  private apiUrl: string = 'https://app.povio.com/api/castro/professional/time_logs';
  private projectsUrl: string = 'https://app.povio.com/api/castro/professional/projects';
  private availableProjectsUrl: string = 'https://app.povio.com/api/castro/professional/time_logs/available_project_users';

  constructor(apiToken?: string) {
    this.apiToken = apiToken || process.env.POVIO_API_TOKEN || '';

    if (!this.apiToken) {
      throw new Error('POVIO_API_TOKEN not configured. Set it in environment variables.');
    }

    // Always prefix the token with the cookie name if not already prefixed
    // Users should provide just the token value, we add _poviolabs_dashboard= automatically
    if (!this.apiToken.startsWith('_poviolabs_dashboard=')) {
      this.apiToken = `_poviolabs_dashboard=${this.apiToken}`;
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
        // Sanitize response to prevent token leakage
        const sanitizedResponse = this.sanitizeErrorResponse(responseText);
        throw new Error(`Povio API error: ${response.status} ${response.statusText}\nResponse: ${sanitizedResponse}`);
      }

      const projectInfo = `Project ID: ${request.projectId}`;
      
      return {
        success: true,
        message: `✓ Worklog posted successfully!\nDate: ${request.date}\nHours: ${request.hours}\n${projectInfo}`,
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
   * Fetch user's projects from Povio (for display purposes - shows project paths)
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
   * Fetch available projects with correct worklog IDs
   * This endpoint returns the actual project IDs used for posting worklogs
   * Response format: [{ id: 15886, name: "FaceFlip" }, ...]
   */
  async fetchAvailableProjects(): Promise<PovioAvailableProject[]> {
    try {
      const response = await fetch(this.availableProjectsUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Cookie': this.apiToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch available projects: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as PovioAvailableProject[];
      
      // Validate the response is an array
      if (!Array.isArray(data)) {
        console.error('Expected array but got:', JSON.stringify(data, null, 2));
        throw new Error('API returned non-array response');
      }

      // Filter out invalid entries
      const validProjects = data.filter(p => 
        p && 
        typeof p.id === 'number' && 
        typeof p.name === 'string' &&
        p.name.trim().length > 0
      );
      
      if (validProjects.length === 0) {
        throw new Error('No valid projects found in API response');
      }

      return validProjects;
    } catch (error) {
      throw new Error(`Failed to fetch available projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Resolve project name to project ID using the correct worklog API
   */
  async resolveProjectId(projectName: string): Promise<number> {
    const projects = await this.fetchAvailableProjects();
    
    // Try exact match first (case insensitive)
    const exactMatch = projects.find(p => 
      p.name.toLowerCase().trim() === projectName.toLowerCase().trim()
    );
    
    if (exactMatch) {
      return exactMatch.id;
    }

    // Try partial match
    const partialMatch = projects.find(p => 
      p.name.toLowerCase().includes(projectName.toLowerCase())
    );

    if (partialMatch) {
      return partialMatch.id;
    }

    throw new Error(`Project "${projectName}" not found. Use list_povio_projects tool to see available projects.`);
  }

  /**
   * Sanitize error response to prevent token leakage
   * Removes any potential cookie/token values from error messages
   */
  private sanitizeErrorResponse(responseText: string): string {
    let sanitized = responseText;
    
    // Remove potential cookie patterns
    sanitized = sanitized.replace(/_poviolabs_dashboard=[^;,\s"]*/gi, '_poviolabs_dashboard=[REDACTED]');
    
    // Remove any long strings that might be tokens (300+ chars, base64-like)
    sanitized = sanitized.replace(/[A-Za-z0-9+/=%]{300,}/g, '[REDACTED_TOKEN]');
    
    // Limit response length to prevent excessive data exposure
    if (sanitized.length > 500) {
      sanitized = sanitized.substring(0, 500) + '...[truncated]';
    }
    
    return sanitized;
  }

  /**
   * Extract project ID from path like "/professional/projects/2598" (for display only)
   */
  private extractProjectId(path: string): number {
    const match = path.match(/\/professional\/projects\/(\d+)/);
    if (!match || !match[1]) {
      throw new Error(`Invalid project path: ${path}`);
    }
    return parseInt(match[1], 10);
  }
}




