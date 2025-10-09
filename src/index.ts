#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { generateWorklog } from './tools/generate.js';
import { postWorklog } from './tools/post.js';
import { generateAndPostWorklog } from './tools/generateAndPost.js';

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
    },
  }
);

// Register available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'generate_worklog',
      description: 'Generate a worklog from git commits for today or yesterday. Analyzes commit messages, extracts ticket numbers, and creates AI-enhanced, professional worklog descriptions following Povio guidelines. AI enhancement is ENABLED BY DEFAULT.',
      inputSchema: {
        type: 'object',
        properties: {
          timeframe: {
            type: 'string',
            enum: ['today', 'yesterday'],
            description: 'Generate worklog for today or yesterday',
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
      description: 'Post a worklog entry to Povio dashboard. Requires description, hours, and date. Uses DEFAULT_PROJECT_ID from environment if projectId not provided.',
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
          hours: {
            type: 'number',
            description: 'Number of hours worked',
          },
          date: {
            type: 'string',
            description: 'Date in YYYY-MM-DD format',
          },
        },
        required: ['description', 'hours', 'date'],
      },
    },
    {
      name: 'generate_and_post_worklog',
      description: 'Generate worklog from git commits AND post it to Povio in one step. Uses DEFAULT_PROJECT_ID from environment if projectId not provided. AI enhancement is ENABLED BY DEFAULT - generation will pause for AI to create an enhanced description before posting.',
      inputSchema: {
        type: 'object',
        properties: {
          timeframe: {
            type: 'string',
            enum: ['today', 'yesterday'],
            description: 'Generate worklog for today or yesterday',
          },
          projectId: {
            type: 'number',
            description: 'Povio project ID (optional, uses DEFAULT_PROJECT_ID from environment if not provided)',
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




