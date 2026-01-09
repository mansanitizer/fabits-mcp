/**
 * Authentication module for Fabits MCP Server
 * Handles login, token storage, and session management
 */

import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import axios, { AxiosInstance } from 'axios';
import { CONFIG } from './config.js';
import { AuthToken, LoginRequest, LoginResponse, KYCStatusResponse, APIResponse } from './types.js';

/**
 * Token Manager - Handles secure storage and retrieval of auth tokens
 */
export class TokenManager {
  private tokenFile: string;
  private cachedToken: AuthToken | null = null;

  constructor(tokenFile: string = CONFIG.TOKEN_FILE) {
    this.tokenFile = tokenFile;
  }

  /**
   * Save auth token to file
   */
  async saveToken(token: AuthToken): Promise<void> {
    try {
      // Ensure directory exists
      await mkdir(dirname(this.tokenFile), { recursive: true });

      // Write token to file
      await writeFile(this.tokenFile, JSON.stringify(token, null, 2), 'utf-8');

      // Cache in memory
      this.cachedToken = token;
    } catch (error) {
      throw new Error(`Failed to save token: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Load auth token from file
   */
  async loadToken(): Promise<AuthToken | null> {
    // Return cached token if available
    if (this.cachedToken) {
      return this.cachedToken;
    }

    try {
      const data = await readFile(this.tokenFile, 'utf-8');
      const token: AuthToken = JSON.parse(data);
      this.cachedToken = token;
      return token;
    } catch (error) {
      // File doesn't exist or is invalid
      return null;
    }
  }

  /**
   * Clear stored token
   */
  async clearToken(): Promise<void> {
    this.cachedToken = null;
    try {
      await writeFile(this.tokenFile, JSON.stringify({}), 'utf-8');
    } catch (error) {
      // Ignore errors when clearing
    }
  }

  /**
   * Get auth token or throw error if not logged in
   */
  async requireToken(): Promise<string> {
    const tokenData = await this.loadToken();
    if (!tokenData || !tokenData.token) {
      throw new Error('Not authenticated. Please login first using fabits_request_otp and fabits_verify_otp');
    }
    return tokenData.token;
  }
}

/**
 * Internal function to refresh token silently
 */
async function silentRefreshToken(tokenManager: TokenManager): Promise<string> {
  const tokenData = await tokenManager.loadToken();

  if (!tokenData || !tokenData.refreshToken) {
    throw new Error('REFRESH_TOKEN_MISSING');
  }

  console.error('\n=== AUTO REFRESH TOKEN ===');
  console.error('Attempting silent token refresh...');

  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        console.error(`Retry attempt ${attempt}/${maxRetries}...`);
        // Wait 1s between retries
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const response = await axios.post<LoginResponse>(
        `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.REFRESH_TOKEN}`,
        { refresh_token: tokenData.refreshToken },
        {
          timeout: CONFIG.REQUEST_TIMEOUT,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.data.access_token) {
        throw new Error('REFRESH_FAILED');
      }

      // Decode new JWT to extract user info
      const decodedToken = decodeJWT(response.data.access_token);

      // Update stored token
      const updatedAuthToken: AuthToken = {
        token: response.data.access_token,
        refreshToken: response.data.refresh_token || tokenData.refreshToken,
        phoneNumber: decodedToken.phoneNumber || tokenData.phoneNumber,
        clientCode: decodedToken.uid || tokenData.clientCode,
        panNumber: decodedToken.panNumber || tokenData.panNumber,
      };

      await tokenManager.saveToken(updatedAuthToken);

      console.error('✅ Token refreshed successfully');
      return updatedAuthToken.token;
    } catch (error) {
      lastError = error;
      console.error(`❌ Token refresh attempt ${attempt} failed:`, error instanceof Error ? error.message : String(error));

      if (axios.isAxiosError(error)) {
        // If 401/403, refresh token is definitely invalid, stop retrying
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new Error('REFRESH_TOKEN_EXPIRED');
        }
        // If 400 (Bad Request), unlikely to succeed on retry
        if (error.response?.status === 400) {
          throw new Error('REFRESH_FAILED');
        }
      }

      // For other errors (5xx, network), continue to next iteration
    }
  }

  // If we exhausted retries
  throw lastError || new Error('REFRESH_FAILED');
}

/**
 * Create authenticated axios instance with auto-refresh capability
 */
export async function createAuthenticatedClient(tokenManager: TokenManager): Promise<AxiosInstance> {
  const token = await tokenManager.requireToken();

  const client = axios.create({
    baseURL: CONFIG.BASE_URL,
    timeout: CONFIG.REQUEST_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  // Add response interceptor for auto token refresh
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // Check if error is 401/403 and we haven't already retried
      if (
        (error.response?.status === 401 || error.response?.status === 403) &&
        !originalRequest._retry
      ) {
        console.error('\n=== AUTH ERROR DETECTED ===');
        console.error('Status:', error.response.status);
        console.error('Attempting auto token refresh...');

        originalRequest._retry = true;

        try {
          // Attempt to refresh token
          const newToken = await silentRefreshToken(tokenManager);

          // Update authorization header with new token
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;

          console.error('✅ Retrying request with new token');

          // Retry the original request
          return client(originalRequest);
        } catch (refreshError: any) {
          console.error('❌ Auto refresh failed:', refreshError.message);

          // Clear token if refresh token is expired
          if (refreshError.message === 'REFRESH_TOKEN_EXPIRED') {
            await tokenManager.clearToken();
            throw new Error(
              '🔐 Session Expired\n\n' +
              'Your refresh token has expired. Please login again:\n' +
              '1. Use fabits_request_otp with your phone number\n' +
              '2. Use fabits_verify_otp with the OTP you receive'
            );
          }

          // Otherwise, throw a clear error about token expiration
          throw new Error(
            '🔐 Access Token Expired\n\n' +
            'Your access token has expired. Try:\n' +
            '1. Use fabits_refresh_token to refresh your session\n' +
            '2. If that fails, login again with fabits_request_otp'
          );
        }
      }

      // For other errors, just pass them through
      return Promise.reject(error);
    }
  );

  return client;
}

/**
 * Step 1: Request OTP - Triggers OTP to be sent to phone number
 */
export async function requestOTP(phoneNumber: string): Promise<string> {
  try {
    const response = await axios.post<APIResponse>(
      `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.REQUEST_OTP}`,
      { phoneNumber },
      {
        timeout: CONFIG.REQUEST_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const { data } = response;

    // Check for errors
    if (data.isError) {
      throw new Error(data.message || 'Failed to send OTP');
    }

    return `📱 OTP Sent!\n\nAn OTP has been sent to ${phoneNumber}\n\nPlease use fabits_verify_otp with your phone number and the OTP you received.`;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Failed to send OTP: ${message}`);
    }
    throw error;
  }
}

/**
 * Decode JWT token to extract user information
 */
function decodeJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    const payload = parts[1];
    const decoded = Buffer.from(payload, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return {};
  }
}

/**
 * Step 2: Verify OTP - Validates OTP and returns authentication token
 */
export async function verifyOTP(phoneNumber: string, otp: string, tokenManager: TokenManager): Promise<string> {
  try {
    const requestData: LoginRequest = {
      phoneNumber,
      otp,
    };

    const url = `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.VERIFY_OTP}`;

    console.error('\n=== VERIFY OTP REQUEST ===');
    console.error('URL:', url);
    console.error('Request Body:', JSON.stringify(requestData, null, 2));
    console.error('Headers:', JSON.stringify({
      'Content-Type': 'application/json',
    }, null, 2));

    const response = await axios.post<LoginResponse>(
      url,
      requestData,
      {
        timeout: CONFIG.REQUEST_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.error('\n=== VERIFY OTP RESPONSE ===');
    console.error('Status:', response.status);
    console.error('Response Data:', JSON.stringify(response.data, null, 2));

    const { data } = response;

    // Check for access token
    if (!data.access_token) {
      console.error('\n=== VERIFY OTP ERROR ===');
      console.error('No access token in response');
      console.error('Full response:', JSON.stringify(data, null, 2));
      throw new Error('Invalid OTP or login failed');
    }

    // Decode JWT to extract user info
    const decodedToken = decodeJWT(data.access_token);
    console.error('\n=== DECODED JWT ===');
    console.error('Decoded payload:', JSON.stringify(decodedToken, null, 2));

    // Store token with refresh token
    const authToken: AuthToken = {
      token: data.access_token,
      refreshToken: data.refresh_token,
      phoneNumber: decodedToken.phoneNumber || phoneNumber,
      clientCode: decodedToken.uid,
      panNumber: decodedToken.panNumber,
    };

    console.error('\n=== TOKEN SAVED ===');
    console.error('Phone:', authToken.phoneNumber);
    console.error('Client Code:', authToken.clientCode);
    console.error('PAN Number:', authToken.panNumber || 'Not available');
    console.error('Token (first 20 chars):', authToken.token.substring(0, 20) + '...');
    console.error('Refresh Token (first 20 chars):', authToken.refreshToken?.substring(0, 20) + '...');

    await tokenManager.saveToken(authToken);

    let loginMessage = `✅ Login Successful!\n\nPhone: ${authToken.phoneNumber}\nClient Code: ${authToken.clientCode || 'Not available'}\nPAN: ${authToken.panNumber || 'Not available'}\nName: ${decodedToken.firstName || ''} ${decodedToken.lastName || ''}\nEmail: ${decodedToken.email || 'Not available'}\n\nYour session is active. You can now search funds and make investments.`;

    // Auto-fetch basket holdings after successful login
    try {
      console.error('\n=== AUTO-FETCHING BASKET HOLDINGS ===');
      const { getBasketHoldings } = await import('./portfolio.js');
      const basketHoldings = await getBasketHoldings(tokenManager);
      loginMessage += `\n\n${'='.repeat(50)}\n\n${basketHoldings}`;
    } catch (basketError) {
      console.error('\n=== BASKET HOLDINGS AUTO-FETCH ERROR (NON-CRITICAL) ===');
      console.error('Error:', basketError);
      // Don't fail login if basket holdings fetch fails
      loginMessage += `\n\n💡 Tip: Use fabits_get_basket_holdings to view your basket investments`;
    }

    return loginMessage;
  } catch (error) {
    console.error('\n=== VERIFY OTP EXCEPTION ===');
    if (axios.isAxiosError(error)) {
      console.error('Axios Error Details:');
      console.error('  Status:', error.response?.status);
      console.error('  Status Text:', error.response?.statusText);
      console.error('  Response Data:', JSON.stringify(error.response?.data, null, 2));
      console.error('  Request URL:', error.config?.url);
      console.error('  Request Data:', error.config?.data);
      const message = error.response?.data?.message || error.message;
      throw new Error(`OTP verification failed: ${message}`);
    }
    console.error('Non-Axios Error:', error);
    throw error;
  }
}

/**
 * Get current authentication status
 */
export async function getAuthStatus(tokenManager: TokenManager): Promise<string> {
  const tokenData = await tokenManager.loadToken();

  if (!tokenData || !tokenData.token) {
    return '❌ Not logged in\n\nPlease use fabits_request_otp to start the login process.';
  }

  // If client code exists, KYC is completed (client code is only assigned after KYC)
  if (tokenData.clientCode) {
    let statusMessage = `✅ Logged in\n\n`;
    statusMessage += `Phone: ${tokenData.phoneNumber}\n`;
    statusMessage += `Client Code: ${tokenData.clientCode}\n`;
    statusMessage += `\nKYC Status:\n`;
    statusMessage += `✅ KYC Completed - You can invest!\n`;

    // Auto-fetch basket holdings when checking status
    try {
      console.error('\n=== AUTO-FETCHING BASKET HOLDINGS (STATUS CHECK) ===');
      const { getBasketHoldings } = await import('./portfolio.js');
      const basketHoldings = await getBasketHoldings(tokenManager);
      statusMessage += `\n${'='.repeat(50)}\n\n${basketHoldings}`;
    } catch (basketError) {
      console.error('\n=== BASKET HOLDINGS AUTO-FETCH ERROR (NON-CRITICAL) ===');
      console.error('Error:', basketError);
      // Don't fail status check if basket holdings fetch fails
    }

    return statusMessage;
  }

  try {
    // Test token validity by fetching KYC status
    const client = await createAuthenticatedClient(tokenManager);
    const response = await client.get<APIResponse<KYCStatusResponse['data']>>(
      CONFIG.ENDPOINTS.KYC_STATUS
    );

    const kycData = response.data.data;
    const kycCompleted = kycData?.kycCompleted || false;
    const kycInitiated = kycData?.kycInitiated || false;

    let statusMessage = `✅ Logged in\n\n`;
    statusMessage += `Phone: ${tokenData.phoneNumber}\n`;
    statusMessage += `Client Code: ${tokenData.clientCode || 'Not available'}\n`;
    statusMessage += `\nKYC Status:\n`;

    if (kycCompleted) {
      statusMessage += `✅ KYC Completed - You can invest!\n`;

      // Auto-fetch basket holdings when checking status for KYC completed users
      try {
        console.error('\n=== AUTO-FETCHING BASKET HOLDINGS (STATUS CHECK - KYC COMPLETED) ===');
        const { getBasketHoldings } = await import('./portfolio.js');
        const basketHoldings = await getBasketHoldings(tokenManager);
        statusMessage += `\n${'='.repeat(50)}\n\n${basketHoldings}`;
      } catch (basketError) {
        console.error('\n=== BASKET HOLDINGS AUTO-FETCH ERROR (NON-CRITICAL) ===');
        console.error('Error:', basketError);
        // Don't fail status check if basket holdings fetch fails
      }
    } else if (kycInitiated) {
      statusMessage += `⏳ KYC In Progress - Complete KYC to start investing\n`;
    } else {
      statusMessage += `❌ KYC Not Started - Please complete KYC to invest\n`;
    }

    return statusMessage;
  } catch (error) {
    // Token might be expired or invalid
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      await tokenManager.clearToken();
      return '❌ Session expired\n\nPlease login again using fabits_request_otp.';
    }

    // Return basic info if KYC check fails
    return `✅ Logged in\n\nPhone: ${tokenData.phoneNumber}\nClient Code: ${tokenData.clientCode || 'Not available'}\n\n⚠️  Unable to verify KYC status at this time.`;
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(tokenManager: TokenManager): Promise<string> {
  try {
    const tokenData = await tokenManager.loadToken();

    if (!tokenData || !tokenData.refreshToken) {
      throw new Error('No refresh token available. Please login again using fabits_request_otp and fabits_verify_otp');
    }

    const url = `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.REFRESH_TOKEN}`;

    console.error('\n=== REFRESH TOKEN REQUEST ===');
    console.error('URL:', url);
    console.error('Refresh Token (first 20 chars):', tokenData.refreshToken.substring(0, 20) + '...');

    const response = await axios.post<LoginResponse>(
      url,
      { refresh_token: tokenData.refreshToken },
      {
        timeout: CONFIG.REQUEST_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.error('\n=== REFRESH TOKEN RESPONSE ===');
    console.error('Status:', response.status);
    console.error('Response Data:', JSON.stringify(response.data, null, 2));

    const { data } = response;

    // Check for access token
    if (!data.access_token) {
      console.error('\n=== REFRESH TOKEN ERROR ===');
      console.error('No access token in response');
      throw new Error('Failed to refresh token');
    }

    // Decode new JWT to extract user info
    const decodedToken = decodeJWT(data.access_token);
    console.error('\n=== DECODED NEW JWT ===');
    console.error('Decoded payload:', JSON.stringify(decodedToken, null, 2));

    // Update stored token with new access token (keep same refresh token)
    const updatedAuthToken: AuthToken = {
      token: data.access_token,
      refreshToken: data.refresh_token || tokenData.refreshToken, // Use new refresh token if provided, else keep old one
      phoneNumber: decodedToken.phoneNumber || tokenData.phoneNumber,
      clientCode: decodedToken.uid || tokenData.clientCode,
      panNumber: decodedToken.panNumber || tokenData.panNumber,
    };

    console.error('\n=== UPDATED TOKEN SAVED ===');
    console.error('Phone:', updatedAuthToken.phoneNumber);
    console.error('Client Code:', updatedAuthToken.clientCode);
    console.error('New Access Token (first 20 chars):', updatedAuthToken.token.substring(0, 20) + '...');

    await tokenManager.saveToken(updatedAuthToken);

    return `✅ Token Refreshed Successfully!\n\nPhone: ${updatedAuthToken.phoneNumber}\nClient Code: ${updatedAuthToken.clientCode || 'Not available'}\n\nYour session has been extended. You can continue using the app.`;
  } catch (error) {
    console.error('\n=== REFRESH TOKEN EXCEPTION ===');
    if (axios.isAxiosError(error)) {
      console.error('Axios Error Details:');
      console.error('  Status:', error.response?.status);
      console.error('  Status Text:', error.response?.statusText);
      console.error('  Response Data:', JSON.stringify(error.response?.data, null, 2));

      // If refresh token is invalid/expired, clear stored tokens
      if (error.response?.status === 401 || error.response?.status === 403) {
        await tokenManager.clearToken();
        throw new Error('Refresh token expired. Please login again using fabits_request_otp and fabits_verify_otp');
      }

      const message = error.response?.data?.message || error.message;
      throw new Error(`Token refresh failed: ${message}`);
    }
    console.error('Non-Axios Error:', error);
    throw error;
  }
}

/**
 * Logout - Clear stored authentication tokens
 */
export async function logout(tokenManager: TokenManager): Promise<string> {
  try {
    const tokenData = await tokenManager.loadToken();

    if (!tokenData || !tokenData.token) {
      return '❌ Not logged in\n\nYou are already logged out.';
    }

    // Optional: Call logout API endpoint if it exists
    try {
      const url = `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.LOGOUT}`;

      console.error('\n=== LOGOUT REQUEST ===');
      console.error('URL:', url);

      await axios.post(
        url,
        {},
        {
          timeout: CONFIG.REQUEST_TIMEOUT,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenData.token}`,
          },
        }
      );

      console.error('\n=== LOGOUT SUCCESS ===');
    } catch (apiError) {
      // Ignore API errors - we'll clear local token anyway
      console.error('\n=== LOGOUT API ERROR (IGNORED) ===');
      console.error('Error:', apiError instanceof Error ? apiError.message : String(apiError));
    }

    // Clear local tokens
    await tokenManager.clearToken();

    console.error('\n=== LOCAL TOKENS CLEARED ===');

    return `✅ Logged Out Successfully!\n\nYour session has been terminated and tokens have been cleared.\n\nTo login again, use:\n• fabits_request_otp\n• fabits_verify_otp`;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Logout failed: ${error.message}`);
    }
    throw error;
  }
}
