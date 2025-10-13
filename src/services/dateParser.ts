/**
 * Date Parser Service
 * Handles parsing of date inputs:
 * - "today", "yesterday"
 * - Specific dates: "2024-10-11", "10/11/2024", "11.10.2024"
 */

export interface ParsedDate {
  date: Date;
  displayName: string;
}

export class DateParser {
  /**
   * Parse a date string into a Date object
   */
  static parse(input: string): ParsedDate {
    const normalized = input.toLowerCase().trim();

    // Handle "today"
    if (normalized === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return { date: today, displayName: 'today' };
    }

    // Handle "yesterday"
    if (normalized === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      return { date: yesterday, displayName: 'yesterday' };
    }

    // Handle specific date formats (YYYY-MM-DD, MM/DD/YYYY, etc.)
    const parsedDate = this.parseSpecificDate(normalized);
    if (parsedDate) {
      return { date: parsedDate, displayName: this.formatDate(parsedDate) };
    }

    throw new Error(
      `Unable to parse date: "${input}". Supported formats: ` +
      `"today", "yesterday", or specific dates (e.g., "2024-10-11", "10/11/2024")`
    );
  }

  /**
   * Parse specific date formats
   */
  private static parseSpecificDate(input: string): Date | null {
    // Try YYYY-MM-DD format
    const dashFormat = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (dashFormat) {
      const [, year, month, day] = dashFormat;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      date.setHours(0, 0, 0, 0);
      if (!isNaN(date.getTime())) return date;
    }

    // Try MM/DD/YYYY format
    const slashFormat = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashFormat) {
      const [, month, day, year] = slashFormat;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      date.setHours(0, 0, 0, 0);
      if (!isNaN(date.getTime())) return date;
    }

    // Try DD.MM.YYYY format
    const dotFormat = input.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (dotFormat) {
      const [, day, month, year] = dotFormat;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      date.setHours(0, 0, 0, 0);
      if (!isNaN(date.getTime())) return date;
    }

    return null;
  }

  /**
   * Format a date to YYYY-MM-DD for display (using local timezone)
   */
  private static formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get the end of day for a given date (23:59:59.999)
   */
  static getEndOfDay(date: Date): Date {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  /**
   * Format a date to ISO string for git queries
   */
  static toISOString(date: Date): string {
    return date.toISOString();
  }
}

