
import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema, McpError, ErrorCode, JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { TOOLS } from './tool-defs.js';
import { dispatchToolCall } from './dispatcher.js';
import { TokenManager } from './auth.js';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import os from 'os';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Store active sessions: sessionId -> { server: Server, transport: SSEServerTransport }
const sessions = new Map<string, { server: Server, transport: SSEServerTransport }>();

// Ensure tokens directory exists
const TOKENS_DIR = path.join(os.homedir(), '.config', 'fabits-mcp', 'tokens');
if (!existsSync(TOKENS_DIR)) {
    mkdirSync(TOKENS_DIR, { recursive: true });
}

/**
 * Create a new MCP Server instance
 */
function createMcpServer() {
    const server = new Server(
        {
            name: 'fabits-mcp-server',
            version: '1.0.0',
        },
        {
            capabilities: {
                tools: {},
            },
        }
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: TOOLS,
        };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        try {
            const { name, arguments: args = {} } = request.params;

            // Extract user_id for multi-user context
            const userId = args?.user_id as string;

            if (!userId) {
                throw new McpError(ErrorCode.InvalidParams, 'Missing required argument: user_id. Please provide the user identifier (phone number).');
            }

            // Initialize TokenManager for this specific user
            const safeUserId = userId.replace(/[^a-z0-9+]/gi, '_');
            const tokenFile = path.join(TOKENS_DIR, `auth_${safeUserId}.json`);
            const tokenManager = new TokenManager(tokenFile);

            return await dispatchToolCall(name, args, tokenManager);
        } catch (error) {
            if (error instanceof McpError) {
                throw error;
            }
            return {
                content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
                isError: true,
            };
        }
    });

    return server;
}

/**
 * SSE Endpoint
 */
app.get('/sse', async (req, res) => {
    console.log('New SSE connection established');

    const transport = new SSEServerTransport('/messages', res);
    const server = createMcpServer();

    // Store session
    sessions.set(transport.sessionId, { server, transport });

    // Clean up on close
    res.on('close', () => {
        console.log(`SSE connection closed: ${transport.sessionId}`);
        sessions.delete(transport.sessionId);
    });

    await server.connect(transport);
});

/**
 * Messages Endpoint
 */
app.post('/messages', async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const session = sessions.get(sessionId);

    if (!session) {
        res.status(404).send('Session not found');
        return;
    }

    await session.transport.handlePostMessage(req, res);
});

app.listen(PORT, () => {
    console.log(`Fabits MCP SSE Server running on port ${PORT}`);
    console.log(`Endpoint: http://localhost:${PORT}/sse`);
});
