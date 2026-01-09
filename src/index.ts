#!/usr/bin/env node

/**
 * Fabits MCP Server
 * Model Context Protocol server for Fabits MyWealth Platform
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';

import { TokenManager } from './auth.js';
import { TOOLS } from './tool-defs.js';
import { dispatchToolCall } from './dispatcher.js';

/**
 * Initialize MCP Server
 */
const server = new Server(
  {
    name: 'fabits-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize token manager (Standard single-user for CLI/Stdio)
const tokenManager = new TokenManager();

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args = {} } = request.params;
    return await dispatchToolCall(name, args, tokenManager);
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Fabits MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
