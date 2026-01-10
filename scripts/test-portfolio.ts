#!/usr/bin/env tsx

/**
 * Test script for portfolio API integration
 * Run this to test the getPortfolio function with real API calls
 * 
 * Usage: npx tsx scripts/test-portfolio.ts
 */

import { TokenManager } from '../src/auth.js';
import { getPortfolio } from '../src/portfolio.js';
import { join } from 'path';
import { homedir } from 'os';

const TOKEN_FILE = join(homedir(), '.config', 'fabits-mcp', 'auth.json');

async function testPortfolio() {
    console.log('🧪 Testing Portfolio API Integration\n');

    try {
        // Load token manager
        console.log('📂 Loading authentication tokens...');
        const tokenManager = new TokenManager('test_user');

        // Check if user is authenticated
        const tokens = tokenManager.getTokens();
        if (!tokens) {
            console.error('❌ No authentication tokens found!');
            console.log('\n💡 Please authenticate first using the MCP server:');
            console.log('   1. Start the MCP server: node build/server.js');
            console.log('   2. Use fabits_request_otp to request OTP');
            console.log('   3. Use fabits_verify_otp to login\n');
            process.exit(1);
        }

        console.log('✅ Tokens loaded successfully!');
        console.log(`   Access Token: ${tokens.accessToken.substring(0, 20)}...`);
        console.log(`   Refresh Token: ${tokens.refreshToken.substring(0, 20)}...\n`);

        // Test getPortfolio
        console.log('📊 Fetching portfolio...\n');
        console.log('='.repeat(60));

        const result = await getPortfolio(tokenManager);

        console.log(result);
        console.log('='.repeat(60));

        console.log('\n✅ Portfolio fetch successful!');

    } catch (error) {
        console.error('\n❌ Error during portfolio test:');
        if (error instanceof Error) {
            console.error(`   ${error.message}`);
            if (error.stack) {
                console.error('\n📋 Stack trace:');
                console.error(error.stack);
            }
        } else {
            console.error(error);
        }
        process.exit(1);
    }
}

// Run the test
testPortfolio();
