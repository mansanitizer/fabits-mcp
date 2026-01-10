
import axios from 'axios';
import { CONFIG } from './config.js';
import { TokenManager, createAuthenticatedClient } from './auth.js';
import { APIResponse, HyperVergeTokenResponse, CustomerDetails, UpdateElogStatusRequest } from './types.js';

// HyperVerge Workflow ID from reference code
const HYPERVERGE_WORKFLOW_ID = 'yGguwb_21_05_25_15_23_04';

/**
 * Generate a simple unique ID for transactions
 */
function generateTransactionId(): string {
    return 'txn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Start KYC Process
 * Uses HyperVerge Onboard Links API to generate a standalone KYC link.
 */
export async function startKYC(tokenManager: TokenManager, pan: string, dob: string): Promise<string> {
    try {
        const tokenData = await tokenManager.loadToken();
        if (!tokenData) throw new Error("Not logged in");

        const transactionId = generateTransactionId();

        const payload = {
            workflowId: HYPERVERGE_WORKFLOW_ID,
            transactionId: transactionId,
            redirectUrl: "https://mywealth.fabits.com/dashboard/start-kyc",
            inputs: {
                panNumber: pan,
                dob: dob, // Expected format by Link KYC API? usually YYYY-MM-DD or DD-MM-YYYY depending on workflow.
                // Assuming user provides what tool requires. If not, API might fail or UI will ask.
                mobileNumber: tokenData.phoneNumber,
            },
            mobileNumber: tokenData.phoneNumber,
            expiry: 1440
        };

        const response = await axios.post(
            'https://ind.idv.hyperverge.co/v1/link-kyc/start',
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'appId': CONFIG.HYPERVERGE_APP_ID,
                    'appKey': CONFIG.HYPERVERGE_APP_KEY
                }
            }
        );

        if (response.data.status === 'success' && response.data.result?.startKycUrl) {
            return `✅ **KYC Link Generated!**\n\nPlease click the link below to complete your KYC verification:\n\n🔗 [Start KYC](${response.data.result.startKycUrl})\n\n**Instructions:**\n1. Click the link to open the secure KYC portal.\n2. Follow the on-screen instructions to verify your PAN and verify your identity.\n3. After completion, you will be redirected back to Fabits.\n4. **Important**: Once you are done, come back here and use 'fabits_check_kyc_status' to verify your status.`;
        } else {
            throw new Error(response.data.result?.error || 'Unknown error generating KYC link');
        }

    } catch (error) {
        if (axios.isAxiosError(error)) {
            const message = error.response?.data?.result?.error || error.message;

            // Fallback to landing page if API fails
            return `⚠️ **KYC Link Generation Failed** (${message})\n\nHowever, you can still complete your KYC manually.\n\nPlease visit: https://mywealth.fabits.com/kyc-landing\nAnd use your PAN (${pan}) and DOB (${dob}) to proceed.`;
        }
        throw error;
    }
}

/**
 * Check KYC Status
 * Fetches detailed status of the user's KYC
 */
export async function checkKYCStatus(tokenManager: TokenManager): Promise<string> {
    try {
        const tokenData = await tokenManager.loadToken();
        if (!tokenData) throw new Error("Not logged in");

        const client = await createAuthenticatedClient(tokenManager);

        // Fetch customer details to get KYC phone number if different? 
        // Usually it's the same.

        const response = await client.get<APIResponse>(
            `${CONFIG.ENDPOINTS.KYC_STATUSES}?kycPhoneNumber=${tokenData.phoneNumber}`
        );

        const statuses = response.data.data; // This is usually an array or object map

        if (!statuses) {
            return "❓ Could not retrieve detailed KYC status.";
        }

        // Format the status for the user
        // The reference code had statuses: auto_approved, needs_review, error, etc.
        // We'll return a raw dump if we don't know the exact structure, or try to interpret it.

        return `📋 **KYC Status Report**\n\n${JSON.stringify(statuses, null, 2)}\n\nIf your status is 'auto_approved' or 'manually_approved', you can proceed to e-Log authentication.`;

    } catch (error) {
        if (axios.isAxiosError(error)) {
            const message = error.response?.data?.message || error.message;
            throw new Error(`Failed to check KYC status: ${message}`);
        }
        throw error;
    }
}

/**
 * Complete BSE e-Log Authentication
 * This usually involves an email loopback.
 */
export async function completeElogAuthentication(tokenManager: TokenManager, clientCode: string): Promise<string> {
    try {
        const client = await createAuthenticatedClient(tokenManager);

        // trigger elog
        const payload = {
            clientCode: clientCode,
            loopbackUrl: "http://localhost:3000/elog-callback", // Dummy as we are in MCP
            allowLoopbackMsg: "true"
        };

        await client.post(CONFIG.ENDPOINTS.ELOG_AUTH, payload);

        return `📧 **e-Log Email Sent!**\n\nPlease check your email registered with CVL/KRA. You should receive a link from BSE/Fabits.\n\nClick the link to verify. After verifying, come back here and use the tool 'fabits_check_kyc_status' again to confirm everything is done!`;

    } catch (error) {
        if (axios.isAxiosError(error)) {
            const message = error.response?.data?.message || error.message;
            throw new Error(`Failed to trigger e-Log: ${message}`);
        }
        throw error;
    }
}
