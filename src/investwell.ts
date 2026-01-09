/**
 * Investwell API integration module
 * Provides functions to interact with Investwell aggregator API
 */

import axios from 'axios';
import { TokenManager } from './auth.js';

// Investwell API configuration
const INVESTWELL_CONFIG = {
    API_URL: 'https://fabits.investwell.app/api/aggregator',
    TOKEN: '896d3946def53af9403494ce119c766a0d08d468b1d61860f3e2a27d6b713bc8',
    HEADERS: { 'User-Agent': 'Mozilla/5.0' },
    REQUEST_TIMEOUT: 30000,
};

/**
 * Helper to get start and end dates for a year
 */
function getStartEndDates(year: number): { startDate: string; endDate: string } {
    return {
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
    };
}

/**
 * Simplified transaction type for output
 */
interface SimplifiedTransaction {
    date: string | null;
    scheme: string | null;
    type: string | null;
    amount: number;
}

/**
 * Get transactions for a client from Investwell API using their PAN
 * @param pan - The PAN number of the client
 * @param year - The year to fetch transactions for (default: 2025)
 */
export async function getInvestwellTransactions(
    pan: string,
    year: number = 2025
): Promise<string> {
    console.error('\n=== INVESTWELL GET TRANSACTIONS ===');
    console.error('PAN:', pan);
    console.error('Year:', year);

    const { startDate, endDate } = getStartEndDates(year);

    const filters = [
        { assetType: 'M' },
        { txnTypeIn: ['NRP', 'SIP', 'STI', 'SWI', 'DIR', 'BON', 'NRS', 'STO', 'SWO', 'SWP', 'DVP'] },
        { selectedDateFrom: startDate },
        { selectedDateTo: endDate },
        { pan: pan },
    ];

    try {
        const url = `${INVESTWELL_CONFIG.API_URL}/reports/getClientTransactions`;
        console.error('URL:', url);
        console.error('Filters:', JSON.stringify(filters, null, 2));

        const response = await axios.get(url, {
            params: {
                token: INVESTWELL_CONFIG.TOKEN,
                filters: JSON.stringify(filters),
            },
            headers: INVESTWELL_CONFIG.HEADERS,
            timeout: INVESTWELL_CONFIG.REQUEST_TIMEOUT,
        });

        console.error('Response Status:', response.status);

        const data = response.data;

        if (data.status === 0 && 'result' in data) {
            const txns = data.result;

            if (!Array.isArray(txns) || txns.length === 0) {
                return `📊 Investwell Transactions for ${year}\n\nPAN: ${pan}\n\n❌ No transactions found for this period.`;
            }

            // Simplify output for the LLM
            const simplified: SimplifiedTransaction[] = txns.map((t: any) => ({
                date: t.navDate || null,
                scheme: t.schemeName || null,
                type: t.txnType || null,
                amount: parseFloat(t.totalAmount || t.amount || 0),
            }));

            // Calculate totals
            const totalAmount = simplified.reduce((sum, t) => sum + t.amount, 0);
            const transactionCount = simplified.length;

            // Format output
            let output = `📊 Investwell Transactions for ${year}\n\n`;
            output += `PAN: ${pan}\n`;
            output += `Total Transactions: ${transactionCount}\n`;
            output += `Total Amount: ₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n`;
            output += `${'='.repeat(50)}\n\n`;

            // Show transactions (limit to 20 for readability)
            const displayTxns = simplified.slice(0, 20);
            displayTxns.forEach((t, i) => {
                output += `${i + 1}. ${t.date || 'N/A'}\n`;
                output += `   Scheme: ${t.scheme || 'N/A'}\n`;
                output += `   Type: ${t.type || 'N/A'}\n`;
                output += `   Amount: ₹${t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n`;
            });

            if (simplified.length > 20) {
                output += `... and ${simplified.length - 20} more transactions\n`;
            }

            console.error('✅ Transactions fetched successfully');
            return output;
        }

        const errorMessage = data.message || 'Unknown error from Investwell API';
        console.error('❌ Error from API:', errorMessage);
        return `❌ Error from Investwell API: ${errorMessage}`;

    } catch (error) {
        console.error('❌ Exception:', error);
        if (axios.isAxiosError(error)) {
            const message = error.response?.data?.message || error.message;
            return `❌ Investwell API Error: ${message}`;
        }
        return `❌ Exception occurred: ${error instanceof Error ? error.message : String(error)}`;
    }
}

/**
 * Test Investwell transactions - gets PAN from authenticated user and fetches their transactions
 * @param tokenManager - Token manager to get user's PAN
 * @param year - The year to fetch transactions for (default: current year)
 */
export async function testInvestwellTransactions(
    tokenManager: TokenManager,
    year?: number
): Promise<string> {
    console.error('\n=== INVESTWELL TEST TRANSACTIONS ===');

    // Get the user's token data to extract PAN
    const tokenData = await tokenManager.loadToken();

    if (!tokenData || !tokenData.token) {
        return '❌ Not authenticated\n\nPlease login first using fabits_request_otp and fabits_verify_otp';
    }

    if (!tokenData.panNumber) {
        return '❌ PAN number not found\n\nYour account does not have a PAN number associated. This may indicate incomplete KYC.';
    }

    const pan = tokenData.panNumber;
    const transactionYear = year || new Date().getFullYear();

    console.error('User PAN:', pan);
    console.error('Fetching transactions for year:', transactionYear);

    // Fetch transactions from Investwell
    return await getInvestwellTransactions(pan, transactionYear);
}
