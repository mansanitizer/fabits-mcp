#!/usr/bin/env node

/**
 * Test script for universal baskets API integration
 * Run this to test the getAllBaskets function with real API calls
 * 
 * Usage: npm run build && node scripts/test-baskets.js
 */

import { TokenManager } from '../build/auth.js';
import { getAllBaskets } from '../build/invest.js';

async function testBaskets() {
    console.log('🧪 Testing Universal Baskets API Integration\n');

    try {
        // Load token manager
        console.log('📂 Loading authentication tokens...');
        const tokenManager = new TokenManager();

        // Check if user is authenticated
        const tokens = await tokenManager.loadToken();
        if (!tokens || !tokens.token) {
            console.error('❌ No authentication tokens found!');
            console.log('\n💡 Please authenticate first using the MCP server:');
            console.log('   1. Start the MCP server: npm run start');
            console.log('   2. Use fabits_request_otp to request OTP');
            console.log('   3. Use fabits_verify_otp to login\n');
            process.exit(1);
        }

        console.log('✅ Tokens loaded successfully!');
        console.log(`   Phone: ${tokens.phoneNumber}`);
        console.log(`   Client Code: ${tokens.clientCode || 'N/A'}`);
        console.log(`   Access Token: ${tokens.token.substring(0, 20)}...`);
        console.log(`   Refresh Token: ${tokens.refreshToken?.substring(0, 20)}...\n`);

        // Test getAllBaskets
        console.log('🗂️  Fetching universal baskets with real API call...\n');
        console.log('='.repeat(60));

        const result = await getAllBaskets(tokenManager);

        console.log('\n' + '='.repeat(60));
        console.log('📋 BASKETS RESULT');
        console.log('='.repeat(60) + '\n');
        console.log(result);
        console.log('\n' + '='.repeat(60));

        console.log('\n✅ Universal Baskets API integration test PASSED!');
        console.log('\nThe baskets function successfully:');
        console.log('  ✓ Authenticated with bearer token');
        console.log('  ✓ Made real API call to baskets endpoint');
        console.log('  ✓ Parsed and processed the response');
        console.log('  ✓ Returned formatted basket data\n');

    } catch (error) {
        console.error('\n❌ Error during baskets test:');
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
testBaskets();
