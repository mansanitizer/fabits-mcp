
import axios from 'axios';
import { CONFIG } from './config.js';
import { TokenManager, createAuthenticatedClient } from './auth.js';
import { APIResponse, HyperVergeTokenResponse, CustomerDetails, UpdateElogStatusRequest } from './types.js';

// HyperVerge Workflow ID from reference code
const HYPERVERGE_WORKFLOW_ID = 'yGguwb_21_05_25_15_23_04';

/**
 * Start KYC Process
 * 1. Validates input
 * 2. Fetches HyperVerge Access Token (for verification that backend is accessible)
 * 3. Returns the KYC URL for the user to visit
 */
export async function startKYC(tokenManager: TokenManager, pan: string, dob: string): Promise<string> {
    try {
        const client = await createAuthenticatedClient(tokenManager);

        // 1. Get HyperVerge Access Token
        // Using the exact endpoint from reference: customerservice/api/hyperverge/accessToken
        // It seems the reference code does a simple POST without specific headers like workflowId in headers, 
        // but maybe the backend handles it.
        // Let's try the simple POST as seen in KycLanding.jsx: post(`${env.UAT_URL}customerservice/api/hyperverge/accessToken`)

        const tokenResponse = await client.post<APIResponse<HyperVergeTokenResponse>>(
            CONFIG.ENDPOINTS.HYPERVERGE_TOKEN,
            {}
        );

        if (tokenResponse.data.isError || !tokenResponse.data.data?.token) {
            console.error('HyperVerge Token Response:', JSON.stringify(tokenResponse.data, null, 2));
            throw new Error('Failed to generate KYC session token');
        }

        const accessToken = tokenResponse.data.data.token;

        // Construct the HyperVerge URL
        return `⚠️  **KYC Action Required**\n\nTo complete video KYC, you need to use the visual interface.\n\nPlease visit https://mywealth.fabits.com/kyc-landing to complete your video verification using the PAN (${pan}) and DOB (${dob}) you provided.\n\nOnce completed, come back here and say "I have finished my KYC".`;

    } catch (error) {
        if (axios.isAxiosError(error)) {
            const message = error.response?.data?.message || error.message;
            throw new Error(`Failed to initiate KYC: ${message}`);
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
