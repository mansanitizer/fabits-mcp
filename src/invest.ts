/**
 * Investment module for Fabits MCP Server
 * Handles lumpsum, SIP, basket investments, and redemptions
 */

import axios from 'axios';
import { createAuthenticatedClient, TokenManager } from './auth.js';
import { CONFIG } from './config.js';
import {
  PlaceOrderRequest,
  PlaceOrderResponse,
  RedeemOrderRequest,
  Basket,
  BasketOrderRequest,
  APIResponse,
} from './types.js';

/**
 * Format currency for display
 */
function formatCurrency(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`;
}

/**
 * Place a lumpsum investment order
 */
export async function investLumpsum(
  tokenManager: TokenManager,
  fundId: string,
  amount: number
): Promise<string> {
  try {
    const client = await createAuthenticatedClient(tokenManager);

    const orderRequest: PlaceOrderRequest = {
      fundId,
      amount,
      orderType: 'PURCHASE',
      transactionMode: 'LUMPSUM',
    };

    console.error('\n=== INVEST LUMPSUM REQUEST ===');
    console.error('URL:', `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.PLACE_ORDER}`);
    console.error('Request Body:', JSON.stringify(orderRequest, null, 2));

    const response = await client.post<APIResponse<PlaceOrderResponse['data']>>(
      CONFIG.ENDPOINTS.PLACE_ORDER,
      orderRequest
    );

    console.error('\n=== INVEST LUMPSUM RESPONSE ===');
    console.error('Status:', response.status);
    console.error('Response Data:', JSON.stringify(response.data, null, 2));

    if (response.data.isError) {
      const errorMsg = response.data.response?.message || 'Order placement failed';
      console.error('\n=== INVEST LUMPSUM ERROR ===');
      console.error('Error Message:', errorMsg);
      console.error('Full Response:', JSON.stringify(response.data, null, 2));
      throw new Error(errorMsg);
    }

    const orderData = response.data.data;

    if (!orderData) {
      console.error('\n=== INVEST LUMPSUM ERROR ===');
      console.error('No order data in response');
      console.error('Full Response:', JSON.stringify(response.data, null, 2));
      throw new Error('No order data received');
    }

    let result = `✅ Lumpsum Order Placed Successfully!\n\n`;
    result += `Order ID: ${orderData.orderId}\n`;
    if (orderData.bseOrderId) result += `BSE Order ID: ${orderData.bseOrderId}\n`;
    result += `Amount: ${formatCurrency(amount)}\n`;
    result += `Status: ${orderData.status}\n`;

    if (orderData.paymentLink) {
      result += `\n💳 Payment Required\n`;
      result += `Payment Link: ${orderData.paymentLink}\n`;
      result += `\nComplete payment to confirm your investment.`;
    } else {
      result += `\n✨ Your order is being processed.`;
    }

    result += `\n\n💡 Track your order: Use fabits_get_transactions`;

    return result;
  } catch (error) {
    console.error('\n=== INVEST LUMPSUM EXCEPTION ===');
    if (axios.isAxiosError(error)) {
      console.error('Axios Error Details:');
      console.error('  Status:', error.response?.status);
      console.error('  Status Text:', error.response?.statusText);
      console.error('  Response Data:', JSON.stringify(error.response?.data, null, 2));
      console.error('  Request URL:', error.config?.url);
      console.error('  Request Data:', error.config?.data);
      const message = error.response?.data?.message || error.response?.data?.response?.message || error.message;
      throw new Error(`Lumpsum investment failed: ${message}\n\nFull Error: ${JSON.stringify(error.response?.data, null, 2)}`);
    }
    if (error instanceof Error) {
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      throw new Error(`Lumpsum investment failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Start a SIP (Systematic Investment Plan)
 */
export async function startSIP(
  tokenManager: TokenManager,
  fundId: string,
  monthlyAmount: number,
  sipDate: number,
  installments?: number
): Promise<string> {
  try {
    const client = await createAuthenticatedClient(tokenManager);

    const orderRequest: PlaceOrderRequest = {
      fundId,
      amount: monthlyAmount,
      orderType: 'PURCHASE',
      transactionMode: 'SIP',
      sipDate,
      sipFrequency: 'MONTHLY',
      installments,
    };

    const response = await client.post<APIResponse<PlaceOrderResponse['data']>>(
      CONFIG.ENDPOINTS.PLACE_ORDER,
      orderRequest
    );

    if (response.data.isError) {
      throw new Error(response.data.response?.message || 'SIP creation failed');
    }

    const orderData = response.data.data;

    if (!orderData) {
      throw new Error('No SIP data received');
    }

    let result = `✅ SIP Started Successfully!\n\n`;
    result += `Order ID: ${orderData.orderId}\n`;
    if (orderData.bseOrderId) result += `BSE Order ID: ${orderData.bseOrderId}\n`;
    result += `Monthly Amount: ${formatCurrency(monthlyAmount)}\n`;
    result += `SIP Date: ${sipDate} of every month\n`;
    if (installments) result += `Total Installments: ${installments}\n`;
    result += `Status: ${orderData.status}\n`;

    if (orderData.paymentLink) {
      result += `\n💳 E-Mandate Setup Required\n`;
      result += `Mandate Link: ${orderData.paymentLink}\n`;
      result += `\nComplete e-mandate setup to activate your SIP.`;
    } else {
      result += `\n✨ Your SIP is being activated.`;
    }

    result += `\n\n💡 View active SIPs: Use fabits_get_sips`;

    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`SIP creation failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Redeem (sell) mutual fund units
 */
export async function redeemFund(
  tokenManager: TokenManager,
  fundId: string,
  units: number | undefined,
  amount: number | undefined,
  redemptionType: 'PARTIAL' | 'FULL' = 'PARTIAL'
): Promise<string> {
  try {
    const client = await createAuthenticatedClient(tokenManager);

    const redeemRequest: RedeemOrderRequest = {
      fundId,
      units,
      amount,
      redemptionType,
    };

    const response = await client.post<APIResponse<PlaceOrderResponse['data']>>(
      CONFIG.ENDPOINTS.REDEEM_ORDER,
      redeemRequest
    );

    if (response.data.isError) {
      throw new Error(response.data.response?.message || 'Redemption failed');
    }

    const orderData = response.data.data;

    if (!orderData) {
      throw new Error('No redemption data received');
    }

    let result = `✅ Redemption Order Placed!\n\n`;
    result += `Order ID: ${orderData.orderId}\n`;
    if (orderData.bseOrderId) result += `BSE Order ID: ${orderData.bseOrderId}\n`;
    result += `Type: ${redemptionType}\n`;
    if (units) result += `Units: ${units}\n`;
    if (amount) result += `Amount: ${formatCurrency(amount)}\n`;
    result += `Status: ${orderData.status}\n`;

    result += `\n✨ Your redemption request is being processed.`;
    result += `\nFunds will be credited to your bank account within 3-4 business days.`;

    result += `\n\n💡 Track redemption: Use fabits_get_transactions`;

    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Redemption failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Invest in a basket (pre-defined portfolio of funds)
 */
export async function investBasket(
  tokenManager: TokenManager,
  basketId: string,
  amount: number
): Promise<string> {
  try {
    const client = await createAuthenticatedClient(tokenManager);

    // First, get basket details to show what funds will be invested in
    const basketResponse = await client.get<APIResponse<Basket[]>>(
      CONFIG.ENDPOINTS.ALL_BASKETS
    );

    const baskets = basketResponse.data.data || [];
    const basket = baskets.find((b) => b.basketId === basketId);

    const basketRequest: BasketOrderRequest = {
      basketId,
      amount,
    };

    const response = await client.post<APIResponse<PlaceOrderResponse['data']>>(
      CONFIG.ENDPOINTS.BASKET_ONE_TIME_ORDER,
      basketRequest
    );

    if (response.data.isError) {
      throw new Error(response.data.response?.message || 'Basket investment failed');
    }

    const orderData = response.data.data;

    if (!orderData) {
      throw new Error('No order data received');
    }

    let result = `✅ Basket Investment Successful!\n\n`;

    if (basket) {
      result += `Basket: ${basket.basketName}\n`;
      result += `Description: ${basket.description}\n`;
      result += `Risk Level: ${basket.riskLevel}\n\n`;

      result += `📊 Fund Allocation:\n`;
      basket.funds.forEach((fund) => {
        const fundAmount = (amount * fund.allocation) / 100;
        result += `• ${fund.fundName}: ${fund.allocation}% (${formatCurrency(fundAmount)})\n`;
      });
      result += '\n';
    }

    result += `Order ID: ${orderData.orderId}\n`;
    result += `Total Amount: ${formatCurrency(amount)}\n`;
    result += `Status: ${orderData.status}\n`;

    if (orderData.paymentLink) {
      result += `\n💳 Payment Link: ${orderData.paymentLink}\n`;
      result += `Complete payment to confirm your investment.`;
    }

    result += `\n\n💡 Track orders: Use fabits_get_transactions`;

    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Basket investment failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get all available baskets
 */
export async function getAllBaskets(tokenManager: TokenManager): Promise<string> {
  try {
    const client = await createAuthenticatedClient(tokenManager);

    const response = await client.get<APIResponse<Basket[]>>(
      CONFIG.ENDPOINTS.ALL_BASKETS
    );

    if (response.data.isError) {
      throw new Error(response.data.response?.message || 'Failed to fetch baskets');
    }

    const baskets = response.data.data || [];

    if (baskets.length === 0) {
      return 'No investment baskets available at this time.';
    }

    let result = `🗂️  Available Investment Baskets\n`;
    result += `${'='.repeat(35)}\n\n`;

    baskets.forEach((basket, index) => {
      result += `${index + 1}. ${basket.basketName}\n`;
      result += `   Basket ID: ${basket.basketId}\n`;
      result += `   ${basket.description}\n`;
      if (basket.category) result += `   Category: ${basket.category}\n`;
      if (basket.riskLevel) result += `   Risk Level: ${basket.riskLevel}\n`;
      if (basket.minAmount) result += `   Min Investment: ${formatCurrency(basket.minAmount)}\n`;
      if (basket.expectedReturns) result += `   Expected Returns: ${basket.expectedReturns}% p.a.\n`;

      if (basket.funds && basket.funds.length > 0) {
        result += `   Funds: ${basket.funds.length} funds\n`;
        basket.funds.forEach((fund) => {
          result += `   • ${fund.allocation}% - ${fund.fundName}\n`;
        });
      }

      result += '\n';
    });

    result += `💡 Invest in basket: Use fabits_invest_basket with Basket ID`;

    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch baskets: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get bank details for payment processing
 */
export async function getBankDetails(tokenManager: TokenManager): Promise<any> {
  try {
    const client = await createAuthenticatedClient(tokenManager);

    console.error('\n=== GET BANK DETAILS REQUEST ===');
    console.error('URL:', `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.BANK_DETAILS}`);

    const response = await client.get<any>(CONFIG.ENDPOINTS.BANK_DETAILS);

    console.error('\n=== GET BANK DETAILS RESPONSE ===');
    console.error('Status:', response.status);
    console.error('Response Data:', JSON.stringify(response.data, null, 2));

    if (response.data.response?.status !== 'SUCCESS') {
      throw new Error(response.data.response?.message || 'Failed to fetch bank details');
    }

    return response.data.response;
  } catch (error) {
    console.error('\n=== GET BANK DETAILS ERROR ===');
    console.error('Error:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to get bank details: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get client code from token
 */
async function getClientCode(tokenManager: TokenManager): Promise<string> {
  const tokenData = await tokenManager.loadToken();

  if (!tokenData) {
    throw new Error('Not authenticated. Please login first.');
  }

  if (!tokenData.clientCode) {
    throw new Error('Client code not found. Please re-login.');
  }

  // Convert clientCode to uppercase format expected by API (e.g., fab3680-ssl -> FAB3680)
  const clientCode = tokenData.clientCode.split('-')[0].toUpperCase();

  console.error('Client Code:', clientCode);

  return clientCode;
}

/**
 * Get phone number without country code
 */
function getPhoneWithoutCountryCode(phoneNumber: string): string {
  // Remove +91 prefix if present
  return phoneNumber.replace(/^\+91/, '');
}

/**
 * Send transactional OTP for investment
 */
export async function sendTransactionalOTP(
  tokenManager: TokenManager,
  phoneNumber: string,
  email: string
): Promise<string> {
  try {
    const client = await createAuthenticatedClient(tokenManager);

    console.error('\n=== SEND TRANSACTIONAL OTP REQUEST ===');
    console.error('URL:', `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.SEND_TRANSACTIONAL_OTP}`);
    console.error('Phone:', phoneNumber);
    console.error('Email:', email);

    const response = await client.post<any>(
      CONFIG.ENDPOINTS.SEND_TRANSACTIONAL_OTP,
      { phoneNumber, email }
    );

    console.error('\n=== SEND TRANSACTIONAL OTP RESPONSE ===');
    console.error('Status:', response.status);
    console.error('Response Data:', JSON.stringify(response.data, null, 2));

    // API returns plain text "Successfully sent Otp" on success
    // Check for 200 status code OR status: 'SUCCESS' in response
    if (response.status === 200 || response.data.status === 'SUCCESS') {
      let result = `📱 Transactional OTP Sent\n\n`;
      result += `OTP has been sent to ${phoneNumber}\n`;
      result += `Please check your phone and provide the OTP to continue with the investment.`;
      return result;
    }

    // If we get here, something went wrong
    const errorMsg = response.data.message || response.data || 'Failed to send transactional OTP';
    console.error('\n=== SEND TRANSACTIONAL OTP ERROR ===');
    console.error('Error Message:', errorMsg);
    console.error('Full Response:', JSON.stringify(response.data, null, 2));
    throw new Error(String(errorMsg));
  } catch (error) {
    console.error('\n=== SEND TRANSACTIONAL OTP EXCEPTION ===');
    if (axios.isAxiosError(error)) {
      console.error('Axios Error Details:');
      console.error('  Status:', error.response?.status);
      console.error('  Status Text:', error.response?.statusText);
      console.error('  Response Data:', JSON.stringify(error.response?.data, null, 2));
      console.error('  Request URL:', error.config?.url);
      console.error('  Request Data:', error.config?.data);
      const message = error.response?.data?.message || error.response?.data?.response?.message || error.message;
      const errorDetails = `
❌ TRANSACTIONAL OTP FAILED

Status: ${error.response?.status} ${error.response?.statusText}
URL: ${error.config?.url}
Request: ${error.config?.data}

Response:
${JSON.stringify(error.response?.data, null, 2)}

Error: ${message}`;
      throw new Error(errorDetails);
    }
    if (error instanceof Error) {
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      throw new Error(`Failed to send transactional OTP: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Verify transactional OTP
 */
export async function verifyTransactionalOTP(
  tokenManager: TokenManager,
  phoneNumber: string,
  otp: string
): Promise<string> {
  try {
    const client = await createAuthenticatedClient(tokenManager);

    console.error('\n=== VERIFY TRANSACTIONAL OTP REQUEST ===');
    console.error('URL:', `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.VERIFY_TRANSACTIONAL_OTP}`);
    console.error('Phone:', phoneNumber);
    console.error('OTP:', otp);

    const response = await client.post<any>(
      CONFIG.ENDPOINTS.VERIFY_TRANSACTIONAL_OTP,
      { phoneNumber, otp }
    );

    console.error('\n=== VERIFY TRANSACTIONAL OTP RESPONSE ===');
    console.error('Status:', response.status);
    console.error('Response Data:', JSON.stringify(response.data, null, 2));

    // API returns plain text "Successfully verified otp" on success
    // Check for 200 status code OR status: 'SUCCESS' in response
    if (response.status === 200 || response.data.status === 'SUCCESS') {
      let result = `✅ OTP Verified Successfully\n\n`;
      result += `You can now proceed with the investment using fabits_complete_lumpsum_upi.`;
      return result;
    }

    // If we get here, OTP was invalid
    const errorMsg = response.data.message || response.data || 'Invalid OTP';
    throw new Error(String(errorMsg));
  } catch (error) {
    console.error('\n=== VERIFY TRANSACTIONAL OTP ERROR ===');
    console.error('Error:', error);
    if (error instanceof Error) {
      throw new Error(`OTP verification failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Poll payment status until approved or failed
 */
async function pollPaymentStatus(
  client: any,
  clientCode: string,
  orderNumber: string,
  maxAttempts: number = 60,
  intervalMs: number = 5000
): Promise<{ success: boolean; status: string; data: string }> {
  console.error('\n=== POLLING PAYMENT STATUS ===');
  console.error('Order Number:', orderNumber);
  console.error('Max Attempts:', maxAttempts);
  console.error('Interval:', intervalMs, 'ms');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.error(`\nAttempt ${attempt}/${maxAttempts}`);

      const response = await client.post(
        CONFIG.ENDPOINTS.PAYMENT_STATUS,
        { clientCode, orderNo: orderNumber }
      );

      console.error('Response:', JSON.stringify(response.data, null, 2));

      // Check if payment is approved (100|)
      if (response.data.status === 'SUCCESS' && response.data.data?.includes('100|')) {
        console.error('✅ Payment approved!');
        return {
          success: true,
          status: 'APPROVED',
          data: response.data.data,
        };
      }

      // Check if payment failed (101|)
      if (response.data.status === 'FAILURE' && response.data.data?.includes('101|')) {
        console.error('❌ Payment rejected!');
        return {
          success: false,
          status: 'REJECTED',
          data: response.data.data,
        };
      }

      // Still pending, wait and retry
      console.error('⏳ Payment pending, retrying...');
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    } catch (error) {
      console.error('Error polling payment status:', error);
      // Continue polling even if there's an error
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  // Timeout reached
  console.error('⚠️  Payment status polling timeout');
  return {
    success: false,
    status: 'TIMEOUT',
    data: 'Payment status could not be confirmed within the timeout period',
  };
}

/**
 * Check payment status for an order (standalone tool)
 */
export async function checkPaymentStatus(
  tokenManager: TokenManager,
  orderNumber: string,
  maxAttempts: number = 20,
  intervalSeconds: number = 30
): Promise<string> {
  try {
    const client = await createAuthenticatedClient(tokenManager);
    const clientCode = await getClientCode(tokenManager);

    console.error('\n=== CHECK PAYMENT STATUS ===');
    console.error('Order Number:', orderNumber);
    console.error('Client Code:', clientCode);
    console.error('Max Attempts:', maxAttempts);
    console.error('Check Interval:', intervalSeconds, 'seconds');

    let result = `🔍 Checking Payment Status\n\n`;
    result += `Order Number: ${orderNumber}\n`;
    result += `Client Code: ${clientCode}\n`;
    result += `Polling every ${intervalSeconds} seconds (max ${maxAttempts} attempts)...\n\n`;

    const paymentStatus = await pollPaymentStatus(
      client,
      clientCode,
      orderNumber,
      maxAttempts,
      intervalSeconds * 1000
    );

    if (paymentStatus.success) {
      result += `✅ Payment Successful!\n\n`;
      result += `Status: APPROVED\n`;
      result += `Details: ${paymentStatus.data}\n\n`;
      result += `🎉 Your investment has been completed successfully!`;
    } else if (paymentStatus.status === 'REJECTED') {
      result += `❌ Payment Failed\n\n`;
      result += `Status: REJECTED\n`;
      result += `Details: ${paymentStatus.data}\n\n`;
      result += `Please try again or contact support.`;
    } else {
      result += `⚠️  Payment Status: Unknown\n\n`;
      result += `The payment status could not be confirmed within ${maxAttempts * intervalSeconds} seconds.\n`;
      result += `This doesn't mean the payment failed - it may still be processing.\n\n`;
      result += `Please check your transaction history later.`;
    }

    return result;
  } catch (error) {
    console.error('\n=== CHECK PAYMENT STATUS ERROR ===');
    if (axios.isAxiosError(error)) {
      console.error('Axios Error:', JSON.stringify(error.response?.data, null, 2));
      const message = error.response?.data?.message || error.message;
      throw new Error(`Payment status check failed: ${message}`);
    }
    if (error instanceof Error) {
      throw new Error(`Payment status check failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Complete UPI lumpsum investment flow
 */
export async function investLumpsumUPI(
  tokenManager: TokenManager,
  schemeCode: string,
  amount: number,
  upiId: string,
  phoneNumber: string,
  email: string
): Promise<string> {
  try {
    const client = await createAuthenticatedClient(tokenManager);

    // Step 1: Verify bank details
    console.error('\n=== STEP 1: VERIFY BANK DETAILS ===');
    console.error('URL:', `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.BANK_DETAILS}`);

    const bankResponse = await client.get<any>(CONFIG.ENDPOINTS.BANK_DETAILS);

    console.error('Bank Details Response:', JSON.stringify(bankResponse.data, null, 2));

    if (bankResponse.data.response?.status !== 'SUCCESS') {
      throw new Error('Bank account not linked. Please add your bank details in the Fabits app first.');
    }

    const bankDetails = bankResponse.data.response;
    console.error('Bank Account Verified:', bankDetails.accountNo, bankDetails.bankName);

    // Step 2: Get client code
    console.error('\n=== STEP 2: GET CLIENT CODE ===');
    const clientCode = await getClientCode(tokenManager);

    // Step 3: Send transactional OTP
    console.error('\n=== STEP 3: SEND TRANSACTIONAL OTP ===');
    await sendTransactionalOTP(tokenManager, phoneNumber, email);

    let result = `📱 Investment OTP Sent\n\n`;
    result += `Bank Account: ${bankDetails.accountHolderName}\n`;
    result += `${bankDetails.bankName} - ${bankDetails.accountNo}\n\n`;
    result += `An OTP has been sent to ${phoneNumber}\n`;
    result += `Please provide the OTP to continue.\n\n`;
    result += `⚠️  After verifying OTP, use fabits_complete_lumpsum_upi with the same details to complete the investment.`;

    return result;
  } catch (error) {
    console.error('\n=== UPI LUMPSUM INVESTMENT ERROR ===');
    if (axios.isAxiosError(error)) {
      console.error('Axios Error Details:');
      console.error('  Status:', error.response?.status);
      console.error('  Response Data:', JSON.stringify(error.response?.data, null, 2));
      const message = error.response?.data?.message || error.response?.data?.response?.message || error.message;
      const errorDetails = `
❌ UPI INVESTMENT INITIATION FAILED

Status: ${error.response?.status} ${error.response?.statusText}
URL: ${error.config?.url}

Response:
${JSON.stringify(error.response?.data, null, 2)}

Error: ${message}`;
      throw new Error(errorDetails);
    }
    if (error instanceof Error) {
      console.error('Error:', error.message);
      // If error already contains detailed formatting, just re-throw it
      if (error.message.includes('❌')) {
        throw error;
      }
      throw new Error(`UPI investment failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Complete UPI lumpsum investment after OTP verification
 */
export async function completeLumpsumUPI(
  tokenManager: TokenManager,
  schemeCode: string,
  amount: number,
  upiId: string,
  phoneNumber: string
): Promise<string> {
  try {
    const client = await createAuthenticatedClient(tokenManager);

    // Get client code from token (uppercase)
    const clientCode = await getClientCode(tokenManager);

    // Remove +91 from phone number
    const phoneOnly = getPhoneWithoutCountryCode(phoneNumber);

    // Step 1: Place order
    console.error('\n=== STEP 1: PLACE ORDER ===');
    console.error('URL:', `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.PLACE_ORDER}`);

    const orderPayload = {
      orderType: 'PURCHASE',
      schemeCode: schemeCode,
      clientCode: clientCode,
      orderVal: amount,
      phoneNumber: phoneOnly,
    };

    console.error('Order Payload:', JSON.stringify(orderPayload, null, 2));

    const orderResponse = await client.post<any>(
      CONFIG.ENDPOINTS.PLACE_ORDER,
      orderPayload
    );

    console.error('\n=== ORDER RESPONSE ===');
    console.error('Response:', JSON.stringify(orderResponse.data, null, 2));

    if (orderResponse.data.status !== 'SUCCESS' && orderResponse.data.code !== '200') {
      throw new Error(orderResponse.data.message || 'Order placement failed');
    }

    // Extract order number from pipe-delimited response data
    // Format: NEW|176000944674900004|2167805110|6173101|61731|FAB3680|message|0
    const responseData = orderResponse.data.data;
    const orderParts = responseData.split('|');
    const orderNumber = orderParts[2]; // Order number is at index 2

    console.error('Order Number:', orderNumber);

    let result = `✅ Step 1/3: Order Placed\n\n`;
    result += `Order Number: ${orderNumber}\n`;
    result += `Amount: ${formatCurrency(amount)}\n\n`;

    // Step 2: Initiate UPI payment
    console.error('\n=== STEP 2: INITIATE UPI PAYMENT ===');
    console.error('URL:', `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.ONE_TIME_PAYMENT}`);

    const paymentPayload = {
      clientCode: clientCode,
      orderNumber: orderNumber,
      totalAmount: amount,
      upiId: upiId,
      modeOfPayment: 'UPI',
      loopbackURL: '',
    };

    console.error('Payment Payload:', JSON.stringify(paymentPayload, null, 2));

    const paymentResponse = await client.post<any>(
      CONFIG.ENDPOINTS.ONE_TIME_PAYMENT,
      paymentPayload
    );

    console.error('\n=== PAYMENT RESPONSE ===');
    console.error('Response:', JSON.stringify(paymentResponse.data, null, 2));

    if (paymentResponse.data.status !== 'SUCCESS') {
      throw new Error(paymentResponse.data.message || 'Payment initiation failed');
    }

    result += `💳 Step 2/3: UPI Payment Initiated\n\n`;
    result += `${paymentResponse.data.data?.responsestring || 'UPI payment request sent'}\n\n`;
    result += `⏳ Step 3/3: Waiting for Payment Confirmation...\n\n`;
    result += `Please approve the payment request on your UPI app (${upiId}).\n`;
    result += `Checking payment status...\n\n`;

    // Step 3: Poll payment status
    console.error('\n=== STEP 3: POLL PAYMENT STATUS ===');

    const paymentStatus = await pollPaymentStatus(client, clientCode, orderNumber);

    if (paymentStatus.success) {
      result += `✅ Payment Successful!\n\n`;
      result += `Status: ${paymentStatus.data}\n`;
      result += `Order Number: ${orderNumber}\n\n`;
      result += `🎉 Your investment has been completed successfully!\n`;
      result += `\n💡 Track your investment: Use fabits_get_transactions`;
    } else if (paymentStatus.status === 'TIMEOUT') {
      result += `⚠️  Payment Status: Pending\n\n`;
      result += `We couldn't confirm your payment status within the timeout period.\n`;
      result += `This doesn't mean the payment failed - it may still be processing.\n\n`;
      result += `Order Number: ${orderNumber}\n\n`;
      result += `💡 Check status later: Use fabits_get_transactions`;
    } else {
      result += `❌ Payment Failed\n\n`;
      result += `Status: ${paymentStatus.data}\n`;
      result += `Order Number: ${orderNumber}\n\n`;
      result += `Please try again or contact support.`;
    }

    return result;
  } catch (error) {
    console.error('\n=== COMPLETE UPI LUMPSUM ERROR ===');
    console.error('Error:', error);
    if (error instanceof Error) {
      throw new Error(`UPI investment completion failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Calculate SIP start date (next month on the specified date)
 */
function calculateSIPStartDate(sipDate: number): string {
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, sipDate);

  const day = String(nextMonth.getDate()).padStart(2, '0');
  const month = String(nextMonth.getMonth() + 1).padStart(2, '0');
  const year = nextMonth.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Fetch action plan details by plan ID
 */
async function getActionPlanById(client: any, planId: number): Promise<any> {
  console.error('\n=== FETCH ACTION PLAN BY ID ===');
  console.error('Plan ID:', planId);
  console.error('URL:', `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.USER_BASKETS}`);

  const response = await client.get(CONFIG.ENDPOINTS.USER_BASKETS);

  console.error('Action Plans Response:', JSON.stringify(response.data, null, 2).substring(0, 500) + '...');

  if (response.data.status !== 'SUCCESS') {
    throw new Error(response.data.message || 'Failed to fetch action plans');
  }

  const allBaskets = response.data.data || [];
  const actionPlans = allBaskets.filter((basket: any) => basket.createdSource === 'ACTION PLAN');
  const plan = actionPlans.find((p: any) => p.customerBasketInvestmentId === planId);

  if (!plan) {
    throw new Error(`Action plan with ID ${planId} not found. Use fabits_get_action_plans to see your available plans.`);
  }

  console.error('Found Action Plan:', plan.customerBasketName);

  return plan;
}

/**
 * Poll mandate status until "RECEIVED BY EXCHANGE" or "APPROVED" or "UNDER PROCESSING"
 */
async function pollMandateStatus(
  client: any,
  mandateId: string,
  clientCode: string,
  maxAttempts: number = 60,
  intervalMs: number = 10000
): Promise<{ success: boolean; status: string; data: any }> {
  console.error('\n=== POLLING MANDATE STATUS ===');
  console.error('Mandate ID:', mandateId);
  console.error('Client Code:', clientCode);
  console.error('Max Attempts:', maxAttempts);
  console.error('Interval:', intervalMs, 'ms');

  // Calculate date range for mandate details query
  const today = new Date();
  const toDate = today.toLocaleDateString('en-GB').replace(/\//g, '/');
  const fromDate = '01/01/2024'; // Start from beginning of year

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.error(`\nAttempt ${attempt}/${maxAttempts}`);

      // Payload matches frontend: { fromDate, toDate, clientCode, mandateId }
      const mandateDetailsPayload = {
        fromDate,
        toDate,
        clientCode,
        mandateId,
      };

      console.error('Request Payload:', JSON.stringify(mandateDetailsPayload, null, 2));

      const response = await client.post(
        CONFIG.ENDPOINTS.MANDATE_DETAILS,
        mandateDetailsPayload
      );

      console.error('Response:', JSON.stringify(response.data, null, 2));

      // Frontend checks response.MandateDetails[0].status
      const mandateDetails = response.data?.MandateDetails?.[0] || response.data?.data?.MandateDetails?.[0];
      const mandateStatus = mandateDetails?.status || response.data?.data?.mandateStatus;

      console.error('Mandate Status:', mandateStatus);

      // Check if mandate is approved (matches frontend logic)
      if (mandateStatus === 'RECEIVED BY EXCHANGE' ||
        mandateStatus === 'APPROVED' ||
        mandateStatus === 'UNDER PROCESSING') {
        console.error('\u2705 Mandate approved/processing!');
        return {
          success: true,
          status: mandateStatus,
          data: mandateDetails || response.data.data,
        };
      }

      // Check if mandate failed
      if (mandateStatus === 'FAILED' || mandateStatus === 'REJECTED') {
        console.error('\u274c Mandate failed!');
        return {
          success: false,
          status: mandateStatus,
          data: mandateDetails || response.data.data,
        };
      }

      // Still pending (NEW or null), wait and retry
      console.error(`\u23f3 Mandate status: ${mandateStatus || 'NEW'}, retrying...`);
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    } catch (error) {
      console.error('Error polling mandate status:', error);
      // Continue polling even if there's an error
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  // Timeout reached
  console.error('\u26a0\ufe0f  Mandate status polling timeout');
  return {
    success: false,
    status: 'TIMEOUT',
    data: 'Mandate status could not be confirmed within the timeout period',
  };
}

/**
 * Check if user has an existing approved mandate
 * Returns mandate ID if approved, null otherwise
 */
async function checkExistingMandate(
  client: any,
  clientCode: string
): Promise<{ mandateId: string; umrn: string; status: string } | null> {
  try {
    console.error('\n=== CHECKING EXISTING MANDATES ===');
    console.error('Client Code:', clientCode);

    // TODO: Need endpoint to get all mandates for user
    // For now, we'll return null and always create new mandate
    // The user needs to provide the endpoint to list mandates

    console.error('No endpoint available to check existing mandates. Will create new mandate.');
    return null;
  } catch (error) {
    console.error('Error checking mandates:', error);
    return null;
  }
}

/**
 * Setup basket mandate - check existing mandate or register new one
 */
export async function setupBasketMandate(
  tokenManager: TokenManager,
  planId: number,
  phoneNumber: string,
  email: string,
  amount?: number,
  bankAccountNumber?: string,
  ifscCode?: string,
  accountType: 'SB' | 'CB' = 'SB',
  mandateType: 'ISIP' | 'XSIP' | 'UNIVERSAL' = 'UNIVERSAL'
): Promise<string> {
  try {
    const client = await createAuthenticatedClient(tokenManager);
    const clientCode = await getClientCode(tokenManager);
    const phoneOnly = getPhoneWithoutCountryCode(phoneNumber);

    let result = `🏦 Setting up Mandate for Action Plan\n\n`;

    // Fetch action plan to get SIP amount
    const actionPlan = await getActionPlanById(client, planId);

    result += `Plan: ${actionPlan.customerBasketName}\n`;
    result += `Plan ID: ${planId}\n`;

    // Extract SIP amount from action plan
    const sipAmount = actionPlan.sipInvestmentAmount || 0;

    if (sipAmount === 0) {
      throw new Error(`This action plan doesn't have a SIP investment. SIP amount is ₹0. Please use fabits_invest_basket_onetime for one-time investments.`);
    }

    // Use provided amount or SIP amount from plan
    const mandateAmount = amount || sipAmount;

    result += `SIP Amount: ${formatCurrency(sipAmount)}\n`;
    result += `Mandate Amount: ${formatCurrency(mandateAmount)}\n\n`;

    // Step 1: Check for existing approved mandate
    console.error('\n=== STEP 1: CHECK EXISTING MANDATE ===');
    const existingMandate = await checkExistingMandate(client, clientCode);

    if (existingMandate && (existingMandate.status === 'RECEIVED BY EXCHANGE' || existingMandate.status === 'APPROVED')) {
      result += `✅ Existing Mandate Found!\n\n`;
      result += `Mandate ID: ${existingMandate.mandateId}\n`;
      if (existingMandate.umrn) result += `UMRN: ${existingMandate.umrn}\n`;
      result += `Status: ${existingMandate.status}\n\n`;
      result += `🎉 Your mandate is already approved and ready to use!\n`;
      result += `\n💡 Next step: Use fabits_invest_basket_sip with mandate ID: ${existingMandate.mandateId}`;
      return result;
    }

    result += `ℹ️  No existing approved mandate found. Creating new mandate...\n\n`;

    // Fetch bank details if not provided
    let accountNumber = bankAccountNumber;
    let ifsc = ifscCode;

    if (!accountNumber || !ifsc) {
      console.error('\n=== FETCHING BANK DETAILS ===');
      console.error('URL:', `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.BANK_DETAILS}`);

      const bankResponse = await client.get<any>(CONFIG.ENDPOINTS.BANK_DETAILS);

      console.error('Bank Details Response:', JSON.stringify(bankResponse.data, null, 2));

      if (bankResponse.data.response?.status !== 'SUCCESS') {
        throw new Error('Bank account not linked. Please add your bank details in the Fabits app first.');
      }

      const bankDetails = bankResponse.data.response;
      accountNumber = bankDetails.accountNo;
      ifsc = bankDetails.ifscCode;

      console.error('Bank Account Retrieved:', accountNumber, bankDetails.bankName);

      result += `📋 Bank Details Retrieved:\n`;
      result += `Account Holder: ${bankDetails.accountHolderName}\n`;
      result += `Bank: ${bankDetails.bankName}\n`;
      result += `Account: ${accountNumber}\n`;
      result += `IFSC: ${ifsc}\n\n`;
    }

    // Step 2: Register mandate
    // Frontend payload: { clientCode, amount, sipStartDate, mandateType }
    // Note: Frontend does NOT send accountNumber, ifscCode, accountType
    console.error('\n=== STEP 2: REGISTER MANDATE ===');
    console.error('URL:', `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.MANDATE_REGISTRATION}`);

    // Calculate SIP start date (next month) in DD/MM/YYYY format
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const sipStartDate = nextMonth.toLocaleDateString('en-GB').replace(/\//g, '/');

    const mandatePayload = {
      clientCode,
      amount: mandateAmount.toString(), // Frontend sends as string
      sipStartDate,
      mandateType, // 'UNIVERSAL' (from frontend)
    };

    console.error('Mandate Payload:', JSON.stringify(mandatePayload, null, 2));

    const mandateResponse = await client.post<any>(
      CONFIG.ENDPOINTS.MANDATE_REGISTRATION,
      mandatePayload
    );

    console.error('Mandate Response:', JSON.stringify(mandateResponse.data, null, 2));

    if (mandateResponse.data.status !== 'SUCCESS') {
      const errorMsg = mandateResponse.data.message || mandateResponse.data.errorDetails || 'Mandate registration failed';
      console.error('\n=== MANDATE REGISTRATION FAILED ===');
      console.error('Error Message:', errorMsg);
      console.error('Full Response:', JSON.stringify(mandateResponse.data, null, 2));
      console.error('Payload Sent:', JSON.stringify(mandatePayload, null, 2));

      throw new Error(`Mandate registration failed: ${errorMsg}\n\nPayload sent:\n${JSON.stringify(mandatePayload, null, 2)}\n\nResponse:\n${JSON.stringify(mandateResponse.data, null, 2)}`);
    }

    result += `✅ Step 2: Mandate Registered\n\n`;

    const mandateId = mandateResponse.data.data?.mandateId;
    const umrn = mandateResponse.data.data?.umrn;

    if (!mandateId) {
      throw new Error('No mandate ID received from registration');
    }

    result += `Mandate ID: ${mandateId}\n`;
    if (umrn) result += `UMRN: ${umrn}\n`;
    result += `\n`;

    // Step 3: Get e-mandate auth URL
    // Frontend payload includes loopBackUrl
    console.error('\n=== STEP 3: GET E-MANDATE AUTH URL ===');
    console.error('URL:', `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.EMANDATE_AUTH_URL}`);

    const authUrlPayload = {
      clientCode,
      mandateId,
      loopBackUrl: 'https://mywealth.fabits.com/dashboard/mutual-funds/mandate', // Required by frontend
    };

    console.error('Auth URL Payload:', JSON.stringify(authUrlPayload, null, 2));

    const authUrlResponse = await client.post<any>(
      CONFIG.ENDPOINTS.EMANDATE_AUTH_URL,
      authUrlPayload
    );

    console.error('Auth URL Response:', JSON.stringify(authUrlResponse.data, null, 2));

    if (authUrlResponse.data.status !== 'SUCCESS') {
      throw new Error(authUrlResponse.data.message || 'Failed to get e-mandate auth URL');
    }

    const authUrl = authUrlResponse.data.data?.authUrl;

    if (!authUrl) {
      throw new Error('No auth URL received');
    }

    result += `🔐 Step 3: E-Mandate Authorization Required\n\n`;
    result += `Auth URL: ${authUrl}\n\n`;
    result += `⚠️  Please open this URL in your browser and complete the e-mandate authentication.\n\n`;

    // Step 4: Poll mandate status (60 attempts x 10 seconds = 10 minutes, matching frontend)
    console.error('\n=== STEP 4: POLL MANDATE STATUS ===');
    result += `\u23f3 Step 4: Waiting for mandate confirmation...\n`;
    result += `Checking mandate status every 10 seconds (max 10 minutes)...\n\n`;

    const mandateStatus = await pollMandateStatus(client, mandateId, clientCode, 60, 10000);

    if (mandateStatus.success) {
      result += `✅ Mandate Setup Complete!\n\n`;
      result += `Status: ${mandateStatus.status}\n`;
      result += `Mandate ID: ${mandateId}\n`;
      if (umrn) result += `UMRN: ${umrn}\n`;
      result += `\n🎉 Your mandate has been registered successfully!\n`;
      result += `\n💡 Next step: Use fabits_invest_basket_sip or fabits_invest_basket_onetime to complete the investment.`;
    } else if (mandateStatus.status === 'TIMEOUT') {
      result += `⚠️  Mandate Status: Pending\n\n`;
      result += `We couldn't confirm your mandate status within 5 minutes.\n`;
      result += `This doesn't mean it failed - it may still be processing.\n\n`;
      result += `Mandate ID: ${mandateId}\n\n`;
      result += `💡 Please check your mandate status later before proceeding with investment.`;
    } else {
      result += `❌ Mandate Setup Failed\n\n`;
      result += `Status: ${mandateStatus.status}\n`;
      result += `Mandate ID: ${mandateId}\n\n`;
      result += `Please try again or contact support.`;
    }

    return result;
  } catch (error) {
    console.error('\n=== SETUP BASKET MANDATE ERROR ===');
    console.error('Error:', error);
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.response?.data?.errorDetails || error.message;
      const requestData = error.config?.data;
      const responseData = error.response?.data;

      console.error('Request URL:', error.config?.url);
      console.error('Request Method:', error.config?.method);
      console.error('Request Data:', requestData);
      console.error('Response Status:', error.response?.status);
      console.error('Response Data:', JSON.stringify(responseData, null, 2));

      throw new Error(`Mandate setup failed: ${message}\n\n📤 Request:\nURL: ${error.config?.url}\nPayload: ${requestData}\n\n📥 Response (${error.response?.status}):\n${JSON.stringify(responseData, null, 2)}`);
    }
    if (error instanceof Error) {
      throw new Error(`Mandate setup failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Invest in basket SIP (for action plans with SIP breakdown)
 */
export async function investBasketSIP(
  tokenManager: TokenManager,
  planId: number,
  sipAmount: number,
  sipDate: number,
  mandateId: string,
  phoneNumber: string
): Promise<string> {
  try {
    const client = await createAuthenticatedClient(tokenManager);
    const clientCode = await getClientCode(tokenManager);
    const phoneOnly = getPhoneWithoutCountryCode(phoneNumber);

    // Calculate SIP start date
    const sipStartDate = calculateSIPStartDate(sipDate);

    console.error('\n=== INVEST BASKET SIP ===');
    console.error('URL:', `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.MULTI_BASKET_SIP_REGISTRATION}`);

    const sipPayload = {
      customerBasketInvestmentId: planId,
      sipAmount,
      sipDate,
      sipStartDate,
      mandateId,
      clientCode,
      phoneNumber: phoneOnly,
    };

    console.error('SIP Payload:', JSON.stringify(sipPayload, null, 2));

    const response = await client.post<any>(
      CONFIG.ENDPOINTS.MULTI_BASKET_SIP_REGISTRATION,
      sipPayload
    );

    console.error('SIP Response:', JSON.stringify(response.data, null, 2));

    if (response.data.status !== 'SUCCESS' && response.data.isError) {
      throw new Error(response.data.message || 'SIP registration failed');
    }

    let result = `✅ Basket SIP Registered Successfully!\n\n`;
    result += `Plan ID: ${planId}\n`;
    result += `Monthly Amount: ${formatCurrency(sipAmount)}\n`;
    result += `SIP Date: ${sipDate} of every month\n`;
    result += `Start Date: ${sipStartDate}\n`;
    result += `Mandate ID: ${mandateId}\n\n`;

    if (response.data.data) {
      const sipData = response.data.data;
      if (sipData.orderId) result += `Order ID: ${sipData.orderId}\n`;
      if (sipData.status) result += `Status: ${sipData.status}\n`;
    }

    result += `\n🎉 Your SIP has been set up successfully!\n`;
    result += `\n💡 Track your SIPs: Use fabits_get_sips`;

    return result;
  } catch (error) {
    console.error('\n=== INVEST BASKET SIP ERROR ===');
    console.error('Error:', error);
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Basket SIP investment failed: ${message}\n\nFull Error: ${JSON.stringify(error.response?.data, null, 2)}`);
    }
    if (error instanceof Error) {
      throw new Error(`Basket SIP investment failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Invest in basket one-time (for action plans with one-time breakdown)
 */
export async function investBasketOneTime(
  tokenManager: TokenManager,
  planId: number,
  amount: number,
  upiId: string,
  phoneNumber: string
): Promise<string> {
  try {
    const client = await createAuthenticatedClient(tokenManager);
    const clientCode = await getClientCode(tokenManager);
    const phoneOnly = getPhoneWithoutCountryCode(phoneNumber);

    let result = `💰 Investing in Action Plan (One-Time)\n\n`;
    result += `Plan ID: ${planId}\n`;
    result += `Amount: ${formatCurrency(amount)}\n\n`;

    // Step 1: Place basket one-time order
    console.error('\n=== STEP 1: PLACE BASKET ONE-TIME ORDER ===');
    console.error('URL:', `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.BASKET_MULTI_ORDER}`);

    const orderPayload = {
      customerBasketInvestmentId: planId,
      amount,
      clientCode,
      phoneNumber: phoneOnly,
    };

    console.error('Order Payload:', JSON.stringify(orderPayload, null, 2));

    const orderResponse = await client.post<any>(
      CONFIG.ENDPOINTS.BASKET_MULTI_ORDER,
      orderPayload
    );

    console.error('Order Response:', JSON.stringify(orderResponse.data, null, 2));

    if (orderResponse.data.status !== 'SUCCESS' && orderResponse.data.isError) {
      throw new Error(orderResponse.data.message || 'Basket order placement failed');
    }

    // Extract order number
    let orderNumber = orderResponse.data.data?.orderNumber || orderResponse.data.data?.orderId;

    if (!orderNumber) {
      // Try to parse from pipe-delimited response data if present
      const responseData = orderResponse.data.data;
      if (typeof responseData === 'string' && responseData.includes('|')) {
        const orderParts = responseData.split('|');
        orderNumber = orderParts[2] || orderParts[1]; // Try index 2 first, fallback to 1
      }
    }

    if (!orderNumber) {
      throw new Error('No order number received from basket order placement');
    }

    result += `✅ Step 1: Order Placed\n\n`;
    result += `Order Number: ${orderNumber}\n`;
    result += `Amount: ${formatCurrency(amount)}\n\n`;

    // Step 2: Initiate UPI payment
    console.error('\n=== STEP 2: INITIATE UPI PAYMENT ===');
    console.error('URL:', `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.ONE_TIME_PAYMENT}`);

    const paymentPayload = {
      clientCode,
      orderNumber,
      totalAmount: amount,
      upiId,
      modeOfPayment: 'UPI',
      loopbackURL: '',
    };

    console.error('Payment Payload:', JSON.stringify(paymentPayload, null, 2));

    const paymentResponse = await client.post<any>(
      CONFIG.ENDPOINTS.ONE_TIME_PAYMENT,
      paymentPayload
    );

    console.error('Payment Response:', JSON.stringify(paymentResponse.data, null, 2));

    if (paymentResponse.data.status !== 'SUCCESS') {
      throw new Error(paymentResponse.data.message || 'Payment initiation failed');
    }

    result += `💳 Step 2: UPI Payment Initiated\n\n`;
    result += `${paymentResponse.data.data?.responsestring || 'UPI payment request sent'}\n\n`;
    result += `⏳ Step 3: Waiting for Payment Confirmation...\n\n`;
    result += `Please approve the payment request on your UPI app (${upiId}).\n`;
    result += `Checking payment status...\n\n`;

    // Step 3: Poll payment status
    console.error('\n=== STEP 3: POLL PAYMENT STATUS ===');

    const paymentStatus = await pollPaymentStatus(client, clientCode, orderNumber);

    if (paymentStatus.success) {
      result += `✅ Payment Successful!\n\n`;
      result += `Status: ${paymentStatus.data}\n`;
      result += `Order Number: ${orderNumber}\n\n`;
      result += `🎉 Your basket investment has been completed successfully!\n`;
      result += `\n💡 Track your investment: Use fabits_get_basket_holdings or fabits_get_transactions`;
    } else if (paymentStatus.status === 'TIMEOUT') {
      result += `⚠️  Payment Status: Pending\n\n`;
      result += `We couldn't confirm your payment status within the timeout period.\n`;
      result += `This doesn't mean the payment failed - it may still be processing.\n\n`;
      result += `Order Number: ${orderNumber}\n\n`;
      result += `💡 Check status later: Use fabits_get_transactions`;
    } else {
      result += `❌ Payment Failed\n\n`;
      result += `Status: ${paymentStatus.data}\n`;
      result += `Order Number: ${orderNumber}\n\n`;
      result += `Please try again or contact support.`;
    }

    return result;
  } catch (error) {
    console.error('\n=== INVEST BASKET ONE-TIME ERROR ===');
    console.error('Error:', error);
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Basket one-time investment failed: ${message}\n\nFull Error: ${JSON.stringify(error.response?.data, null, 2)}`);
    }
    if (error instanceof Error) {
      throw new Error(`Basket one-time investment failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Register a standalone mandate (without requiring a plan)
 * Returns mandateId and authUrl for user to complete authentication
 * Does NOT poll - user should call checkMandateStatus after completing auth
 */
export async function registerMandate(
  tokenManager: TokenManager,
  amount: number
): Promise<string> {
  try {
    const client = await createAuthenticatedClient(tokenManager);
    const clientCode = await getClientCode(tokenManager);

    console.error('\n=== REGISTER STANDALONE MANDATE ===');
    console.error('Amount:', amount);
    console.error('Client Code:', clientCode);

    // Calculate SIP start date (next month) in DD/MM/YYYY format
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const sipStartDate = nextMonth.toLocaleDateString('en-GB').replace(/\//g, '/');

    // Step 1: Register mandate
    console.error('\n=== STEP 1: REGISTER MANDATE ===');
    console.error('URL:', `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.MANDATE_REGISTRATION}`);

    const mandatePayload = {
      clientCode,
      amount: amount.toString(),
      sipStartDate,
      mandateType: 'UNIVERSAL',
    };

    console.error('Mandate Payload:', JSON.stringify(mandatePayload, null, 2));

    const mandateResponse = await client.post<any>(
      CONFIG.ENDPOINTS.MANDATE_REGISTRATION,
      mandatePayload
    );

    console.error('Mandate Response:', JSON.stringify(mandateResponse.data, null, 2));

    if (mandateResponse.data.status !== 'SUCCESS') {
      const errorMsg = mandateResponse.data.message || mandateResponse.data.data || 'Mandate registration failed';
      throw new Error(`Mandate registration failed: ${errorMsg}`);
    }

    const mandateId = mandateResponse.data.mandateId || mandateResponse.data.data?.mandateId;
    const mandateStatus = mandateResponse.data.mandateStatus || mandateResponse.data.data?.mandateStatus;

    if (!mandateId) {
      throw new Error('No mandate ID received from registration');
    }

    console.error('Mandate ID:', mandateId);
    console.error('Mandate Status:', mandateStatus);

    // Step 2: Get e-mandate auth URL
    console.error('\n=== STEP 2: GET E-MANDATE AUTH URL ===');
    console.error('URL:', `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.EMANDATE_AUTH_URL}`);

    const authUrlPayload = {
      clientCode,
      mandateId,
      loopBackUrl: 'https://mywealth.fabits.com/dashboard/mutual-funds/mandate',
    };

    console.error('Auth URL Payload:', JSON.stringify(authUrlPayload, null, 2));

    const authUrlResponse = await client.post<any>(
      CONFIG.ENDPOINTS.EMANDATE_AUTH_URL,
      authUrlPayload
    );

    console.error('Auth URL Response:', JSON.stringify(authUrlResponse.data, null, 2));

    let authUrl = '';
    if (authUrlResponse.data.status === 'SUCCESS' || authUrlResponse.data.Status === 100) {
      authUrl = authUrlResponse.data.data?.authUrl || authUrlResponse.data.RedirectURL || '';
    }

    // Format response for user
    let result = `╔════════════════════════════════════════════════════════════╗\n`;
    result += `║  🏦 MANDATE REGISTERED                                     ║\n`;
    result += `╠════════════════════════════════════════════════════════════╣\n`;
    result += `║                                                            ║\n`;
    result += `║  📋 MANDATE ID: ${mandateId.padEnd(41)}║\n`;
    result += `║     (SAVE THIS - You'll need it for SIPs)                  ║\n`;
    result += `║                                                            ║\n`;
    result += `║  💰 Amount: ${formatCurrency(amount).padEnd(45)}║\n`;
    result += `║  📊 Status: PENDING (awaiting bank authentication)         ║\n`;
    result += `║                                                            ║\n`;
    result += `╠════════════════════════════════════════════════════════════╣\n`;
    result += `║  🔐 COMPLETE E-MANDATE AUTHENTICATION                      ║\n`;
    result += `╠════════════════════════════════════════════════════════════╣\n`;

    if (authUrl) {
      result += `║                                                            ║\n`;
      result += `║  ${authUrl}\n`;
      result += `║                                                            ║\n`;
    } else {
      result += `║  ⚠️  Auth URL not available. Your bank may send an SMS.   ║\n`;
    }

    result += `╠════════════════════════════════════════════════════════════╣\n`;
    result += `║  📝 NEXT STEPS:                                            ║\n`;
    result += `║  1. Open the link above in your browser                    ║\n`;
    result += `║  2. Complete the bank authentication                       ║\n`;
    result += `║  3. Come back and say "Check mandate status ${mandateId}"  ║\n`;
    result += `║                                                            ║\n`;
    result += `║  ⚠️  IMPORTANT: Save your Mandate ID - ${mandateId}        ║\n`;
    result += `║     You can use it later to check status or start SIPs    ║\n`;
    result += `╚════════════════════════════════════════════════════════════╝\n`;

    return result;
  } catch (error) {
    console.error('\n=== REGISTER MANDATE ERROR ===');
    console.error('Error:', error);
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.response?.data?.data || error.message;
      throw new Error(`Mandate registration failed: ${message}`);
    }
    if (error instanceof Error) {
      throw new Error(`Mandate registration failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Check mandate status by mandate ID
 * User can call this anytime to check if their mandate is approved
 */
export async function checkMandateStatus(
  tokenManager: TokenManager,
  mandateId: string
): Promise<string> {
  try {
    const client = await createAuthenticatedClient(tokenManager);
    const clientCode = await getClientCode(tokenManager);

    console.error('\n=== CHECK MANDATE STATUS ===');
    console.error('Mandate ID:', mandateId);
    console.error('Client Code:', clientCode);

    // Calculate date range
    const today = new Date();
    const toDate = today.toLocaleDateString('en-GB').replace(/\//g, '/');
    const fromDate = '01/01/2024';

    const mandateDetailsPayload = {
      fromDate,
      toDate,
      clientCode,
      mandateId,
    };

    console.error('Request Payload:', JSON.stringify(mandateDetailsPayload, null, 2));

    const response = await client.post<any>(
      CONFIG.ENDPOINTS.MANDATE_DETAILS,
      mandateDetailsPayload
    );

    console.error('Response:', JSON.stringify(response.data, null, 2));

    // Parse response (frontend checks response.MandateDetails[0].status)
    const mandateDetails = response.data?.MandateDetails?.[0] || response.data?.data?.MandateDetails?.[0];
    const status = mandateDetails?.status || response.data?.data?.mandateStatus || 'UNKNOWN';
    const umrn = mandateDetails?.umrn || mandateDetails?.UMRN || '';
    const amount = mandateDetails?.amount || mandateDetails?.Amount || '';

    let result = '';

    if (status === 'RECEIVED BY EXCHANGE' || status === 'APPROVED' || status === 'UNDER PROCESSING') {
      result += `╔════════════════════════════════════════════════════════════╗\n`;
      result += `║  ✅ MANDATE APPROVED                                       ║\n`;
      result += `╠════════════════════════════════════════════════════════════╣\n`;
      result += `║                                                            ║\n`;
      result += `║  📋 Mandate ID: ${mandateId.padEnd(41)}║\n`;
      result += `║  📊 Status: ${status.padEnd(46)}║\n`;
      if (umrn) {
        result += `║  🔖 UMRN: ${umrn.padEnd(48)}║\n`;
      }
      if (amount) {
        result += `║  💰 Amount: ${formatCurrency(Number(amount)).padEnd(45)}║\n`;
      }
      result += `║                                                            ║\n`;
      result += `╠════════════════════════════════════════════════════════════╣\n`;
      result += `║  🎉 READY FOR SIP INVESTMENTS!                             ║\n`;
      result += `║                                                            ║\n`;
      result += `║  Use this mandate_id with:                                 ║\n`;
      result += `║  • fabits_start_sip - for individual fund SIPs             ║\n`;
      result += `║  • fabits_invest_basket_sip - for action plan SIPs         ║\n`;
      result += `╚════════════════════════════════════════════════════════════╝\n`;
    } else if (status === 'FAILED' || status === 'REJECTED') {
      result += `╔════════════════════════════════════════════════════════════╗\n`;
      result += `║  ❌ MANDATE FAILED                                         ║\n`;
      result += `╠════════════════════════════════════════════════════════════╣\n`;
      result += `║                                                            ║\n`;
      result += `║  📋 Mandate ID: ${mandateId.padEnd(41)}║\n`;
      result += `║  📊 Status: ${status.padEnd(46)}║\n`;
      result += `║                                                            ║\n`;
      result += `║  The mandate was rejected by your bank or BSE.             ║\n`;
      result += `║  Please try registering a new mandate.                     ║\n`;
      result += `╚════════════════════════════════════════════════════════════╝\n`;
    } else {
      result += `╔════════════════════════════════════════════════════════════╗\n`;
      result += `║  ⏳ MANDATE PENDING                                        ║\n`;
      result += `╠════════════════════════════════════════════════════════════╣\n`;
      result += `║                                                            ║\n`;
      result += `║  📋 Mandate ID: ${mandateId.padEnd(41)}║\n`;
      result += `║  📊 Status: ${(status || 'PENDING').padEnd(46)}║\n`;
      result += `║                                                            ║\n`;
      result += `║  The mandate is still awaiting bank approval.              ║\n`;
      result += `║                                                            ║\n`;
      result += `║  ℹ️  Please ensure you completed the e-mandate             ║\n`;
      result += `║     authentication at your bank's portal.                  ║\n`;
      result += `║                                                            ║\n`;
      result += `║  💡 If you haven't completed auth yet:                     ║\n`;
      result += `║     Ask me to "register mandate" again to get a new link.  ║\n`;
      result += `║                                                            ║\n`;
      result += `║  ⏰ Check again in a few minutes if you just completed it. ║\n`;
      result += `╚════════════════════════════════════════════════════════════╝\n`;
    }

    return result;
  } catch (error) {
    console.error('\n=== CHECK MANDATE STATUS ERROR ===');
    console.error('Error:', error);
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Mandate status check failed: ${message}`);
    }
    if (error instanceof Error) {
      throw new Error(`Mandate status check failed: ${error.message}`);
    }
    throw error;
  }
}
