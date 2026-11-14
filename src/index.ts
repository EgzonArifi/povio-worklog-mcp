#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { generateWorklog } from './tools/generate.js';
import { formatValidation, povioPostingInstructions, validateWorklog, POVIO_MCP_URL } from './tools/validate.js';

/**
 * Worklog MCP Server
 *
 * Generates worklog descriptions from git commits and validates them. Reading
 * and posting time logs is done by Povio's official MCP server.
 */

const server = new Server(
  {
    name: 'worklog-mcp-server',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
      prompts: {
        listChanged: true,
      },
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'generate_worklog',
      description: `Generate a worklog description from git commits. Analyzes commit messages, extracts ticket numbers, and returns writing rules for a short, professional description following Povio guidelines. The output also explains how to validate it and post it through Povio's official MCP server (${POVIO_MCP_URL}).

Supported date formats:
- "today", "yesterday"
- Specific dates: "2024-10-28" (YYYY-MM-dd), "10/28/2024" (MM/dd/YYYY), "28.10.2024" (dd.MM.YYYY)

Trigger examples:
- "wl", "wl today", "wl yesterday", "wl 2024-10-28"
- "wl FaceFlip 8", "wl yesterday FaceFlip 6" (generate, then post via Povio's MCP)
- "generate worklog for yesterday"
- "what did I work on yesterday"`,
      inputSchema: {
        type: 'object',
        properties: {
          timeframe: {
            type: 'string',
            description: 'Date format: "today", "yesterday", or specific date like "2024-10-28" (YYYY-MM-dd)',
          },
          repository: {
            type: 'string',
            description: 'Path to git repository (optional, defaults to current directory)',
          },
          project: {
            type: 'string',
            description: 'Povio project name, when the user wants to post (optional)',
          },
          hours: {
            type: 'number',
            description: 'Hours worked, when the user wants to post (optional)',
          },
          enhanceWithAI: {
            type: 'boolean',
            description: 'AI enhancement is enabled by default. Set to false to get the basic auto-generated description instead',
          },
        },
        required: ['timeframe'],
      },
    },
    {
      name: 'validate_worklog',
      description: `Check a worklog description before posting it to Povio: every ticket ID is present and it is not too long. Needs no Povio token. Call it before professional_save_time_log.

Trigger examples:
- "validate this worklog"
- "check this description has all tickets"`,
      inputSchema: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: 'The final worklog description',
          },
          tickets: {
            type: 'array',
            items: { type: 'string' },
            description: 'Ticket IDs that must appear in the description (e.g. from generate_worklog)',
          },
          maxLength: {
            type: 'number',
            description: 'Maximum length in characters (suggested: 450)',
          },
        },
        required: ['description'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'generate_worklog': {
        const typedArgs = args as any;
        const result = await generateWorklog(typedArgs);

        if (result.aiEnhancementPrompt) {
          const posting = result.commits.length > 0
            ? `\n\n---\n${povioPostingInstructions({
                date: result.date,
                hours: typedArgs.hours,
                project: typedArgs.project,
                tickets: result.ticketNumbers,
              })}`
            : '';
          return {
            content: [
              {
                type: 'text',
                text: `${result.aiEnhancementPrompt}${posting}

---
AUTO-GENERATED DESCRIPTION (for reference):
${result.description}

---
FULL WORKLOG DATA:
${JSON.stringify({
  date: result.date,
  commits: result.commits,
  ticketNumbers: result.ticketNumbers,
}, null, 2)}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'validate_worklog': {
        const typedArgs = args as any;
        const result = validateWorklog({
          description: typedArgs.description,
          tickets: typedArgs.tickets,
          maxLength: typedArgs.maxLength,
        });
        return {
          content: [{ type: 'text', text: formatValidation(result) }],
          isError: !result.valid,
        };
      }

      case 'post_worklog':
      case 'generate_and_post_worklog':
      case 'list_povio_projects':
        throw new Error(`${name} was removed in povio-worklog-mcp 2.0. Read and post time logs with Povio's official MCP server (${POVIO_MCP_URL}): professional_list_available_project_users, professional_list_time_logs and professional_save_time_log.`);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        },
      ],
      isError: true,
    };
  }
});

server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [
    {
      name: 'wl',
      title: 'Generate Worklog',
      description: 'Quick worklog generation from git commits for today, yesterday, or a specific date. With project and hours, it also posts the worklog through Povio\'s official MCP server.',
      arguments: [
        {
          name: 'timeframe',
          description: 'Date: "today", "yesterday", or specific date (YYYY-MM-dd, MM/dd/YYYY, or dd.MM.YYYY)',
          required: false,
        },
        {
          name: 'project',
          description: 'Povio project name (e.g., "FaceFlip"). With hours, the worklog is posted.',
          required: false,
        },
        {
          name: 'hours',
          description: 'Number of hours worked. Needed to post.',
          required: false,
        },
      ],
    },
  ],
}));

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'wl') {
    const timeframe = (args?.timeframe as string) || 'today';
    const project = args?.project as string | undefined;
    const hours = args?.hours as string | number | undefined;

    const toolCall = [
      `- timeframe: "${timeframe}"`,
      project ? `- project: "${project}"` : '',
      hours ? `- hours: ${hours}` : '',
    ].filter(Boolean).join('\n');

    const text = project && hours
      ? `Please generate a worklog from git commits for ${timeframe} and post it to Povio project "${project}" with ${hours} hours worked.

Call the generate_worklog tool with:
${toolCall}

Write the description, then follow the POSTING steps in the tool output (validate_worklog, then Povio's MCP tools).`
      : project
      ? `Please generate a worklog from git commits for ${timeframe} (project: ${project}).

Call the generate_worklog tool with:
${toolCall}

Show the description. To post it, the user still needs to give the hours.`
      : `Please generate a worklog from git commits for ${timeframe}.

Call the generate_worklog tool with timeframe: "${timeframe}". The tool will analyze your git commits, extract ticket numbers, and explain how to write a professional worklog description.`;

    return {
      description: project && hours ? 'Generate and post worklog to Povio' : 'Generate worklog from git commits',
      messages: [
        {
          role: 'user',
          content: { type: 'text', text },
        },
      ],
    };
  }

  throw new Error(`Unknown prompt: ${name}`);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // stdout is reserved for MCP protocol
    console.error('Worklog MCP Server running on stdio');
  } catch (error) {
    console.error('Error during server initialization:', error);
    throw error;
  }
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  setTimeout(() => {
    process.exit(1);
  }, 100);
});
