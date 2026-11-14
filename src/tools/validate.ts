/**
 * Worklog validation and posting guidance.
 *
 * Since 2.0 this package no longer talks to the Povio dashboard. Reading and
 * posting time logs goes through Povio's official MCP server
 * (https://app.povio.com/mcp), which signs in with OAuth instead of a cookie
 * that expires. This module checks a description before it is posted and
 * tells the assistant which Povio MCP tools to call.
 */

export const POVIO_MCP_URL = 'https://app.povio.com/mcp';

/** Suggested description limit; long worklogs read as padding on invoices. */
export const DEFAULT_MAX_LENGTH = 450;

export interface ValidateWorklogArgs {
  description: string;
  tickets?: string[];
  maxLength?: number;
}

export interface ValidationResult {
  valid: boolean;
  length: number;
  errors: string[];
}

export function validateWorklog(args: ValidateWorklogArgs): ValidationResult {
  const description = (args.description ?? '').trim();
  const errors: string[] = [];

  if (!description) {
    errors.push('Description is empty.');
  }

  if (args.maxLength !== undefined) {
    if (!Number.isInteger(args.maxLength) || args.maxLength <= 0) {
      throw new Error('maxLength must be a positive whole number');
    }
    if (description.length > args.maxLength) {
      errors.push(`Description is ${description.length} characters, over the limit of ${args.maxLength}. Shorten it (fewer words per group, drop minor details).`);
    }
  }

  // Guard against dropping tickets when the description is condensed or grouped
  const tickets = (args.tickets ?? []).map(t => t.trim()).filter(Boolean);
  const missing = tickets.filter(t => !description.includes(t));
  if (missing.length > 0) {
    errors.push(`Description is missing ticket(s): ${missing.join(', ')}. Add them.`);
  }

  return { valid: errors.length === 0, length: description.length, errors };
}

export function formatValidation(result: ValidationResult): string {
  if (result.valid) {
    return `VALID (${result.length} characters). Ready to post.`;
  }
  return `INVALID - do not post.\n${result.errors.map(e => `- ${e}`).join('\n')}`;
}

export interface PostingContext {
  date: string;
  hours?: number;
  project?: string;
  tickets: string[];
  /** 'cli' tells the assistant to validate with the povio-worklog CLI instead of the MCP tool. */
  via?: 'mcp' | 'cli';
}

/**
 * Instructions appended to generated worklogs: validate, check for an existing
 * entry, then post through Povio's MCP server.
 */
export function povioPostingInstructions(ctx: PostingContext): string {
  const ticketArg = ctx.tickets.length ? `, tickets: ${JSON.stringify(ctx.tickets)}` : '';
  const project = ctx.project ? `"${ctx.project}"` : 'the project the user names (ask if unknown)';
  const hours = ctx.hours !== undefined ? String(ctx.hours) : 'the hours the user gives (ask if unknown)';

  const validate = ctx.via === 'cli'
    ? `Run \`povio-worklog validate --description - --max-length ${DEFAULT_MAX_LENGTH}${ctx.tickets.length ? ` --tickets ${ctx.tickets.join(',')}` : ''}\` with the final description on stdin. Fix and re-run until it prints VALID (exit 0).`
    : `Call validate_worklog with the final description${ticketArg}, maxLength: ${DEFAULT_MAX_LENGTH}. Fix and re-check until it is VALID.`;

  return `POSTING (only if posting was asked for):
1. ${validate}
2. Posting uses Povio's official MCP server (${POVIO_MCP_URL}). If its professional_* tools are not available, show the description and tell the user to connect that server; do not post any other way.
3. Call professional_list_available_project_users and pick the entry whose name matches ${project}. Its id is the project_user_id.
4. Call professional_list_time_logs (per_page: 50; it has no date filter, so read further pages until you pass ${ctx.date}) and look for an existing entry on ${ctx.date} for that project. If one exists, do not post a second one; show it to the user instead. If this check fails, do not post.
5. Call professional_save_time_log with project_user_id, description, end_date: "${ctx.date}", estimate: ${hours}. Do not pass task_id (that edits an existing log).`;
}
