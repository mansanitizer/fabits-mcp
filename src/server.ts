
import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema, McpError, ErrorCode, JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { TOOLS } from './tool-defs.js';
import { dispatchToolCall } from './dispatcher.js';
import { TokenManager } from './auth.js';
import path from 'path';
import { existsSync, mkdirSync, readFileSync } from 'fs';
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

// Payment Redirect Endpoint
const PAYMENTS_DIR = path.join(os.homedir(), '.config', 'fabits-mcp', 'payments');
if (!existsSync(PAYMENTS_DIR)) {
    mkdirSync(PAYMENTS_DIR, { recursive: true });
}

app.get('/pay/:orderId', (req, res) => {
    const { orderId } = req.params;
    const cleanOrderId = orderId.replace(/[^a-z0-9]/gi, ''); // Sanitize
    const filePath = path.join(PAYMENTS_DIR, `${cleanOrderId}.html`);

    console.log(`[Payment] Requested Order ID: ${cleanOrderId}`);
    console.log(`[Payment] Looking for file: ${filePath}`);

    if (existsSync(filePath)) {
        try {
            // Use readFileSync instead of sendFile to avoid path resolution issues
            // import { readFileSync } from 'fs'; needs to be added to imports if not present,
            // but we can just use fs.readFileSync if we import all of fs or add it locally.
            // Since we only imported specific named exports from 'fs', let's fix imports first or assume we edit imports.
            // Wait, previous replace_file_content for server.ts only had { existsSync, mkdirSync }.
            // We need to add readFileSync to imports or just use it if we change imports.
            // Let's assume we will fix imports in a separate step or just use a dynamic read here? 
            // Better to fix imports properly.
            // For this step's ReplacementContent, I will assume readFileSync is available or I will add it to the import line in a separate step?
            // Actually, I can replace the import line in this same file if I widen the scope?
            // checking file content... import { existsSync, mkdirSync } from 'fs';
            // I'll stick to 'fs' imports update in a separate call to be safe, or just use fs.readFileSync if I imported * as fs?
            // server.ts has: import { existsSync, mkdirSync } from 'fs';
            // I will update this handler to use fs.readFileSync and *add* readFileSync to the import list in a PREVIOUS step or just update imports now.
            // I will update the import in a separate step to be clean.

            // For now, write the handler assuming readFileSync is available.

            const htmlContent = readFileSync(filePath, 'utf-8');
            res.setHeader('Content-Type', 'text/html');
            res.send(htmlContent);
            console.log(`[Payment] Served file successfully`);
        } catch (err) {
            console.error(`[Payment] Error reading file: ${err}`);
            res.status(500).send('Internal Server Error');
        }
    } else {
        console.warn(`[Payment] File not found: ${filePath}`);
        res.status(404).send(`
            <html>
                <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                    <h1>Payment Link Expired or Invalid</h1>
                    <p>The payment link you are trying to access is no longer available or the order ID is incorrect.</p>
                </body>
            </html>
        `);
    }
});

app.listen(PORT, () => {
    console.log(`Fabits MCP SSE Server running on port ${PORT}`);
    console.log(`Endpoint: http://localhost:${PORT}/sse`);
});
