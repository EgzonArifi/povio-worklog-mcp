import { PovioWorklogRequest, PovioWorklogResponse } from '../types/index.js';

export class PovioService {
  private apiToken: string;
  private apiUrl: string = 'https://app.povio.com/api/castro/professional/time_logs';

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
      
      // Build query string matching the shell script
      const queryString = new URLSearchParams({
        'filters[daterange_start]': startDate,
        'filters[daterange_end]': endDate,
        'filters[project_id]': '',
        'filters[group]': 'day'
      }).toString();

      // Build JSON payload matching the shell script exactly
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
}




