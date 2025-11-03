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
import { postWorklog } from './tools/post.js';
import { generateAndPostWorklog } from './tools/generateAndPost.js';
import { listProjects } from './tools/listProjects.js';

/**
 * Worklog MCP Server
 * 
 * Provides tools for generating worklogs from git commits and posting to Povio dashboard
 */

// Create MCP server instance
const server = new Server(
  {
    name: 'worklog-mcp-server',
    version: '1.0.0',
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

// Register available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'list_povio_projects',
      description: `List all active projects assigned to you in Povio. Shows project names and IDs for easy reference when posting worklogs.

Trigger examples:
- "wl list"
- "list my povio projects"
- "show me my projects"
- "what projects do I have"
- "list projects"`,
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'generate_worklog',
      description: `Generate a worklog from git commits. Analyzes commit messages, extracts ticket numbers, and creates AI-enhanced, professional worklog descriptions following Povio guidelines. AI enhancement is ENABLED BY DEFAULT.

Supported date formats:
- "today", "yesterday"
- Specific dates: "2024-10-28" (YYYY-MM-dd), "10/28/2024" (MM/dd/YYYY), "28.10.2024" (dd.MM.YYYY)

Trigger examples:
- "wl"
- "wl today"
- "wl yesterday"
- "wl 2024-10-28"
- "generate worklog"
- "generate worklog for yesterday"
- "generate worklog for 2024-10-28"
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
          enhanceWithAI: {
            type: 'boolean',
            description: 'AI enhancement is enabled by default. Set to false to disable and get basic auto-generated description instead',
          },
        },
        required: ['timeframe'],
      },
    },
    {
      name: 'post_worklog',
      description: `Post a worklog entry to Povio dashboard. Supports both project ID and project name. Uses DEFAULT_PROJECT_ID from environment if neither is provided.

Trigger examples:
- "wl post 8"
- "wl post FaceFlip 8"
- "post worklog with 4 hours"
- "post worklog to FaceFlip"
- "post 6 hours to Autobiography"
- "submit worklog for today"
- "post [description] to [project] for [hours] hours"`,
      inputSchema: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: 'Worklog description',
          },
          projectId: {
            type: 'number',
            description: 'Povio project ID (optional, uses DEFAULT_PROJECT_ID from environment if not provided)',
          },
          projectName: {
            type: 'string',
            description: 'Project name (alternative to projectId, will be resolved automatically)',
          },
          hours: {
            type: 'number',
            description: 'Number of hours worked',
          },
          date: {
            type: 'string',
            description: 'Date in YYYY-MM-dd format',
          },
        },
        required: ['description', 'hours', 'date'],
      },
    },
    {
      name: 'generate_and_post_worklog',
      description: `Generate worklog from git commits AND post it to Povio in one step. Supports both project ID and project name. AI enhancement is ENABLED BY DEFAULT - generation will pause for AI to create an enhanced description before posting.

Supported date formats:
- "today", "yesterday"
- Specific dates: "2024-10-28" (YYYY-MM-dd), "10/28/2024" (MM/dd/YYYY), "28.10.2024" (dd.MM.YYYY)

Trigger examples:
- "wl FaceFlip 8"
- "wl Autobiography 4"
- "wl yesterday FaceFlip 6"
- "wl 2024-10-28 FaceFlip 8"
- "generate and post worklog for today with 8 hours"
- "generate and post to FaceFlip, 5 hours"
- "create and submit worklog to Autobiography for 3 hours"
- "wl post [project] [hours]"`,
      inputSchema: {
        type: 'object',
        properties: {
          timeframe: {
            type: 'string',
            description: 'Date format: "today", "yesterday", or specific date like "2024-10-28" (YYYY-MM-dd)',
          },
          projectId: {
            type: 'number',
            description: 'Povio project ID (optional, uses DEFAULT_PROJECT_ID from environment if not provided)',
          },
          projectName: {
            type: 'string',
            description: 'Project name (alternative to projectId, will be resolved automatically)',
          },
          hours: {
            type: 'number',
            description: 'Number of hours worked',
          },
          repository: {
            type: 'string',
            description: 'Path to git repository (optional, defaults to current directory)',
          },
          enhanceWithAI: {
            type: 'boolean',
            description: 'AI enhancement is enabled by default. Set to false to disable and auto-post without AI enhancement (not recommended)',
          },
        },
        required: ['timeframe', 'hours'],
      },
    },
  ],
}));

// Handle tool execution requests
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_povio_projects': {
        const result = await listProjects();
        return {
          content: [
            {
              type: 'text',
              text: `${result.message}\n\n${result.summary}`,
            },
          ],
        };
      }

      case 'generate_worklog': {
        const result = await generateWorklog(args as any);
        
        // If AI enhancement is requested, format response to guide AI
        if (result.aiEnhancementPrompt) {
          return {
            content: [
              {
                type: 'text',
                text: `${result.aiEnhancementPrompt}

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
        
        // Standard response
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'post_worklog': {
        const result = await postWorklog(args as any);
        return {
          content: [
            {
              type: 'text',
              text: result.message,
            },
          ],
        };
      }

      case 'generate_and_post_worklog': {
        const typedArgs = args as any;
        const result = await generateAndPostWorklog(typedArgs);
        
        // If AI enhancement was requested, the worklog won't be posted yet
        // Return guidance for AI to generate enhanced description first
        if (result.generated.aiEnhancementPrompt) {
          return {
            content: [
              {
                type: 'text',
                text: `${result.generated.aiEnhancementPrompt}

---
NOTE: After generating the enhanced description, use the 'post_worklog' tool to submit it:
- Date: ${result.generated.date}
- Hours: ${typedArgs.hours}
- Project ID: ${typedArgs.projectId ?? process.env.DEFAULT_PROJECT_ID}

AUTO-GENERATED DESCRIPTION (for reference):
${result.generated.description}`,
              },
            ],
          };
        }
        
        // Standard response
        return {
          content: [
            {
              type: 'text',
              text: result.summary,
            },
          ],
        };
      }

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

// Register available prompts
server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [
    {
      name: 'wl',
      title: 'Generate Worklog',
      description: 'Quick worklog generation from git commits. Generate for today, yesterday, or a specific date. Optionally specify project and hours to generate and post in one step.',
      arguments: [
        {
          name: 'timeframe',
          description: 'Date: "today", "yesterday", or specific date (YYYY-MM-dd, MM/dd/YYYY, or dd.MM.YYYY)',
          required: false,
        },
        {
          name: 'project',
          description: 'Project name (e.g., "FaceFlip", "Autobiography") or ID. If provided with hours, will generate and post worklog.',
          required: false,
        },
        {
          name: 'hours',
          description: 'Number of hours worked. Required if posting to Povio (when project is specified).',
          required: false,
        },
      ],
    },
  ],
}));

// Handle prompt retrieval requests
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'wl') {
    const timeframe = (args?.timeframe as string) || 'today';
    const project = args?.project as string | undefined;
    const hours = args?.hours as number | undefined;

    // If project and hours are provided, generate and post
    if (project && hours) {
      return {
        description: 'Generate and post worklog to Povio',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please generate a worklog from git commits for ${timeframe} and post it to Povio project "${project}" with ${hours} hours worked.

Call the generate_and_post_worklog tool with:
- timeframe: "${timeframe}"
- projectName: "${project}"
- hours: ${hours}`,
            },
          },
        ],
      };
    }

    // If only project is provided (without hours), just generate but mention the project
    if (project) {
      return {
        description: 'Generate worklog from git commits',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please generate a worklog from git commits for ${timeframe} (project: ${project}).

Call the generate_worklog tool with timeframe: "${timeframe}". After reviewing the generated worklog, you can post it using the post_worklog tool with the project name "${project}" and the hours worked.`,
            },
          },
        ],
      };
    }

    // If only timeframe (or nothing), just generate
    return {
      description: 'Generate worklog from git commits',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please generate a worklog from git commits for ${timeframe}.

Call the generate_worklog tool with timeframe: "${timeframe}". The tool will analyze your git commits, extract ticket numbers, and create a professional worklog description.`,
          },
        },
      ],
    };
  }

  throw new Error(`Unknown prompt: ${name}`);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // Log to stderr (stdout is reserved for MCP protocol)
  console.error('Worklog MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});




