/**
 * Portfolio module for Fabits MCP Server
 * Handles holdings, SIPs, and transaction history
 */

import { createAuthenticatedClient, TokenManager } from './auth.js';
import { CONFIG } from './config.js';
import { Holding, SIP, Order, Portfolio, APIResponse } from './types.js';

/**
 * Format currency for display
 */
function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '₹0.00';
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

/**
 * Format percentage for display
 */
function formatPercentage(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/**
 * Get user's complete portfolio with holdings
 * Fetches both Fabits managed assets and external linked assets
 */
export async function getPortfolio(tokenManager: TokenManager): Promise<string> {
  try {
    console.error('\n' + '='.repeat(70));
    console.error('🔍 PORTFOLIO API REQUEST');
    console.error('='.repeat(70));

    // Create authenticated client with bearer token
    const client = await createAuthenticatedClient(tokenManager);
    const fullUrl = `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.HOLDINGS}`;

    console.error(`📡 Endpoint: ${fullUrl}`);
    console.error(`🔑 Using Bearer Token Authentication`);
    console.error(`⏰ Request Time: ${new Date().toISOString()}`);

    // Make API request
    const startTime = Date.now();
    const response = await client.get<APIResponse<any>>(
      CONFIG.ENDPOINTS.HOLDINGS
    );
    const duration = Date.now() - startTime;

    console.error(`\n✅ Response received in ${duration}ms`);
    console.error(`📊 Status Code: ${response.status}`);
    console.error(`📦 Response Headers:`, JSON.stringify(response.headers, null, 2));

    // Log response structure (truncated for security)
    const responsePreview = JSON.stringify(response.data, null, 2);
    console.error(`\n📄 Response Preview (first 800 chars):`);
    console.error(responsePreview.substring(0, 800) + (responsePreview.length > 800 ? '...' : ''));

    // Validate response
    if (!response.data) {
      throw new Error('Empty response received from API');
    }

    if (response.data.isError) {
      const errorMsg = response.data.response?.message || response.data.message || 'Failed to fetch portfolio';
      console.error(`\n❌ API Error: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    // Extract data - API can return data in response.data.data OR directly in response.data
    let data = response.data.data || response.data;

    console.error(`\n📋 Data Structure Analysis:`);
    console.error(`   - Type: ${Array.isArray(data) ? 'Array' : typeof data}`);
    if (Array.isArray(data)) {
      console.error(`   - Length: ${data.length} items`);
    } else if (typeof data === 'object') {
      console.error(`   - Keys: ${Object.keys(data).join(', ')}`);
    }

    // Initialize holding lists
    let fabitsHoldings: Holding[] = [];
    let externalHoldings: Holding[] = [];
    let allHoldings: Holding[] = [];

    // Parse holdings from response
    if (Array.isArray(data)) {
      allHoldings = data;
      console.error(`   ✓ Parsed as direct array`);
    } else if (typeof data === 'object' && data !== null) {
      // Try different possible structures
      allHoldings = data.mainData || data.holdings || [];

      // Support split structure if it exists
      if (data.fabitsHoldings) {
        allHoldings = [...allHoldings, ...data.fabitsHoldings];
        console.error(`   ✓ Added ${data.fabitsHoldings.length} from fabitsHoldings`);
      }
      if (data.externalHoldings) {
        allHoldings = [...allHoldings, ...data.externalHoldings];
        console.error(`   ✓ Added ${data.externalHoldings.length} from externalHoldings`);
      }

      console.error(`   ✓ Parsed from nested structure`);
    }

    console.error(`\n📊 Holdings Summary:`);
    console.error(`   - Total holdings found: ${allHoldings.length}`);

    // Normalize holdings data - API uses different field names
    allHoldings = allHoldings.map((item: any) => {
      const units = item.netUnits || item.balance || item.units || 0;
      const currentNav = item.closerate || item.currentNav || 0;
      const investedValue = item.netInvestedAmt || item.investedValue || 0;
      const currentValue = item.holding || item.currentValue || (units * currentNav);
      const returns = currentValue - investedValue;
      const returnsPercentage = investedValue > 0 ? (returns / investedValue) * 100 : 0;

      return {
        fundId: item.schemeCode || item.fundId || '',
        fundName: item.schemeName || item.fundName || 'Unknown Fund',
        schemeCode: item.bseSchemeCode || item.schemeCode || '',
        units: units,
        avgNav: item.avgNav || (investedValue / units) || 0,
        currentNav: currentNav,
        investedValue: investedValue,
        currentValue: currentValue,
        returns: returns,
        returnsPercentage: returnsPercentage,
        folioNumber: item.folioNumber || item.folioNo,
        isOutsideData: item.isOutsideData,
        holdingType: item.holdingType
      } as Holding;
    });

    // Split based on isOutsideData flag
    // 0 = Fabits (Internal/Managed)
    // 1 or truthy = External/Linked
    fabitsHoldings = allHoldings.filter(h => h.isOutsideData === 0);
    externalHoldings = allHoldings.filter(h => h.isOutsideData !== 0);

    console.error(`   - Fabits managed: ${fabitsHoldings.length}`);
    console.error(`   - External linked: ${externalHoldings.length}`);

    if (fabitsHoldings.length === 0 && externalHoldings.length === 0) {
      console.error('\n📭 Portfolio is empty');
      return `📊 Your Portfolio is Empty\n\n` +
        `Start investing to build your wealth!\n\n` +
        `💡 Get started:\n` +
        `• Search funds: Use fabits_search_funds\n` +
        `• View recommendations: Use fabits_get_star_funds`;
    }

    // Function to calculate totals for a list of holdings
    const calculateTotals = (items: Holding[]) => {
      let invested = 0;
      let current = 0;
      items.forEach(item => {
        invested += item.investedValue || 0;
        current += item.currentValue || 0;
      });
      return { invested, current, returns: current - invested };
    };

    const fabitsTotals = calculateTotals(fabitsHoldings);
    const externalTotals = calculateTotals(externalHoldings);
    const grandTotalInvested = fabitsTotals.invested + externalTotals.invested;
    const grandTotalCurrent = fabitsTotals.current + externalTotals.current;
    const grandTotalReturns = grandTotalCurrent - grandTotalInvested;
    const grandTotalReturnsPercent = grandTotalInvested > 0 ? (grandTotalReturns / grandTotalInvested) * 100 : 0;

    console.error(`\n💰 Portfolio Totals:`);
    console.error(`   - Total Invested: ₹${grandTotalInvested.toFixed(2)}`);
    console.error(`   - Current Value: ₹${grandTotalCurrent.toFixed(2)}`);
    console.error(`   - Returns: ₹${grandTotalReturns.toFixed(2)} (${grandTotalReturnsPercent.toFixed(2)}%)`);
    console.error('='.repeat(70) + '\n');

    // Build result
    let result = `📊 Your Portfolio Overview\n`;
    result += `${'='.repeat(50)}\n\n`;

    // 1. Grand Total Summary
    result += `💰 Total Net Worth\n`;
    result += `Current Value: ${formatCurrency(grandTotalCurrent)}\n`;
    result += `Total Invested: ${formatCurrency(grandTotalInvested)}\n`;
    result += `Total Returns: ${formatCurrency(grandTotalReturns)} (${formatPercentage(grandTotalReturnsPercent)})\n\n`;

    // 2. Fabits Managed Assets
    if (fabitsHoldings.length > 0) {
      const returnsPercent = fabitsTotals.invested > 0 ? (fabitsTotals.returns / fabitsTotals.invested) * 100 : 0;

      result += `🚀 Fabits Investments (${fabitsHoldings.length})\n`;
      result += `   Value: ${formatCurrency(fabitsTotals.current)} | Returns: ${formatCurrency(fabitsTotals.returns)} (${formatPercentage(returnsPercent)})\n`;
      result += `   ${'-'.repeat(40)}\n`;

      fabitsHoldings.forEach((holding, index) => {
        const returnSign = holding.returns >= 0 ? '📈' : '📉';
        result += `   ${index + 1}. ${holding.fundName}\n`;
        result += `      ${returnSign} Current: ${formatCurrency(holding.currentValue)} | Invested: ${formatCurrency(holding.investedValue)}\n`;
        result += `      Returns: ${formatCurrency(holding.returns)} (${formatPercentage(holding.returnsPercentage)})\n`;
        result += `      Units: ${holding.units.toFixed(3)} | NAV: ₹${holding.currentNav.toFixed(2)}\n\n`;
      });
    }

    // 3. External/Linked Assets
    if (externalHoldings.length > 0) {
      const returnsPercent = externalTotals.invested > 0 ? (externalTotals.returns / externalTotals.invested) * 100 : 0;

      result += `🔗 External Linked Investments (${externalHoldings.length})\n`;
      result += `   Value: ${formatCurrency(externalTotals.current)} | Returns: ${formatCurrency(externalTotals.returns)} (${formatPercentage(returnsPercent)})\n`;
      result += `   (Imported from CAS/External sources)\n`;
      result += `   ${'-'.repeat(40)}\n`;

      externalHoldings.forEach((holding, index) => {
        const returnSign = holding.returns >= 0 ? '📈' : '📉';
        result += `   ${index + 1}. ${holding.fundName}\n`;
        result += `      ${returnSign} Current: ${formatCurrency(holding.currentValue)} | Invested: ${formatCurrency(holding.investedValue)}\n`;
        result += `      Returns: ${formatCurrency(holding.returns)} (${formatPercentage(holding.returnsPercentage)})\n`;
        // Check if folio is available, often useful for external funds
        if (holding.folioNumber) result += `      Folio: ${holding.folioNumber}\n`;
        result += `      Units: ${holding.units.toFixed(3)} | NAV: ₹${holding.currentNav.toFixed(2)}\n\n`;
      });
    }

    result += `💡 Actions:\n`;
    if (fabitsHoldings.length > 0) {
      result += `• Redeem Fabits funds: Use fabits_redeem\n`;
    }
    result += `• Transaction history: Use fabits_get_transactions\n`;
    result += `• Basket holdings: Use fabits_get_basket_holdings`;

    return result;
  } catch (error) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ PORTFOLIO API ERROR');
    console.error('='.repeat(70));

    if (error instanceof Error) {
      console.error(`Error Message: ${error.message}`);
      if (error.stack) {
        console.error(`\nStack Trace:\n${error.stack}`);
      }
      throw new Error(`Failed to fetch portfolio: ${error.message}`);
    }

    console.error('Unknown error:', error);
    console.error('='.repeat(70) + '\n');
    throw error;
  }
}

/**
 * Get all active SIPs
 */
export async function getSIPs(tokenManager: TokenManager): Promise<string> {
  try {
    const client = await createAuthenticatedClient(tokenManager);

    const response = await client.get<APIResponse<SIP[]>>(
      CONFIG.ENDPOINTS.USER_SIPS
    );

    if (response.data.isError) {
      throw new Error(response.data.response?.message || 'Failed to fetch SIPs');
    }

    const sips = response.data.data || [];

    if (sips.length === 0) {
      return `📅 No Active SIPs\n\n` +
        `Start a SIP to invest regularly and benefit from rupee cost averaging!\n\n` +
        `💡 Start SIP: Use fabits_start_sip`;
    }

    let result = `📅 Your Active SIPs\n`;
    result += `${'='.repeat(50)}\n\n`;

    const activeSIPs = sips.filter((sip) => sip.status === 'ACTIVE');
    const otherSIPs = sips.filter((sip) => sip.status !== 'ACTIVE');

    if (activeSIPs.length > 0) {
      result += `✅ Active SIPs (${activeSIPs.length})\n\n`;

      activeSIPs.forEach((sip, index) => {
        result += `${index + 1}. ${sip.fundName}\n`;
        result += `   SIP ID: ${sip.sipRegistrationNumber}\n`;
        result += `   Amount: ${formatCurrency(sip.amount)} on ${sip.sipDate} of every month\n`;
        result += `   Frequency: ${sip.frequency}\n`;
        result += `   Installments Paid: ${sip.installmentsPaid}`;
        if (sip.totalInstallments) result += ` / ${sip.totalInstallments}`;
        result += '\n';
        result += `   Start Date: ${formatDate(sip.startDate)}`;
        if (sip.endDate) result += ` | End Date: ${formatDate(sip.endDate)}`;
        result += '\n\n';
      });
    }

    if (otherSIPs.length > 0) {
      result += `📋 Other SIPs (${otherSIPs.length})\n\n`;

      otherSIPs.forEach((sip, index) => {
        result += `${index + 1}. ${sip.fundName} - Status: ${sip.status}\n`;
        result += `   SIP ID: ${sip.sipRegistrationNumber}\n`;
        result += `   Amount: ${formatCurrency(sip.amount)} | Installments Paid: ${sip.installmentsPaid}\n\n`;
      });
    }

    result += `💡 Cancel SIP: Use fabits_cancel_sip with SIP ID`;

    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch SIPs: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get transaction history (tries basket orders, falls back to regular orders)
 */
export async function getTransactions(
  tokenManager: TokenManager,
  limit: number = 20
): Promise<string> {
  try {
    const client = await createAuthenticatedClient(tokenManager);

    console.error('\n=== TRANSACTION HISTORY REQUEST ===');
    console.error('URL:', `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.BASKET_ORDER_HISTORY}`);

    let response: any;
    let orders: any[] = [];

    // Try basket order history first
    try {
      response = await client.get<any>(
        CONFIG.ENDPOINTS.BASKET_ORDER_HISTORY
      );

      console.error('\n=== BASKET ORDER HISTORY RESPONSE ===');
      console.error('Status:', response.status);
      console.error('Response Data (truncated):', JSON.stringify(response.data, null, 2).substring(0, 500) + '...');

      // Check response status
      if (response.data.status === 'SUCCESS') {
        orders = response.data.orders || [];
      }
    } catch (basketError) {
      console.error('\n=== BASKET ORDER HISTORY FAILED, TRYING REGULAR ORDER HISTORY ===');
      console.error('Basket Error:', basketError instanceof Error ? basketError.message : String(basketError));

      // Fall back to regular order history
      const regularResponse = await client.get<any>(
        CONFIG.ENDPOINTS.ORDER_HISTORY
      );

      console.error('\n=== REGULAR ORDER HISTORY RESPONSE ===');
      console.error('Status:', regularResponse.status);
      console.error('Response Data (truncated):', JSON.stringify(regularResponse.data, null, 2).substring(0, 500) + '...');

      // Handle regular order history format
      if (regularResponse.data.status === 'SUCCESS' || !regularResponse.data.isError) {
        orders = regularResponse.data.data || regularResponse.data.orders || [];
      } else {
        throw new Error(regularResponse.data.message || 'Failed to fetch transactions');
      }
    }

    if (orders.length === 0) {
      return `📜 No Transactions Yet\n\n` +
        `Your transaction history will appear here once you make investments.\n\n` +
        `💡 Start investing: Use fabits_search_funds or fabits_get_star_funds`;
    }

    // Group orders by status for compact display
    const successfulOrders = orders.filter((o: any) => o.currentStatus === 'COMPLETED' || o.orderStatus === 'SUCCESS');
    const pendingOrders = orders.filter((o: any) => o.currentStatus === 'PENDING' || o.orderStatus === 'PENDING');
    const failedOrders = orders.filter((o: any) => o.currentStatus === 'FAILED' || o.orderStatus === 'FAILURE');

    let result = `📜 Transaction History\n`;
    result += `${'='.repeat(50)}\n`;
    result += `Total: ${orders.length} orders | ✅ ${successfulOrders.length} Success | ⏳ ${pendingOrders.length} Pending | ❌ ${failedOrders.length} Failed\n\n`;

    // Show successful orders (compact)
    if (successfulOrders.length > 0) {
      result += `✅ Successful Orders (showing last ${Math.min(limit, successfulOrders.length)})\n\n`;

      const limitedSuccess = successfulOrders.slice(0, limit);
      limitedSuccess.forEach((order: any, index: number) => {
        const buySell = order.buySell === 'P' ? '📥 BUY' : '📤 SELL';
        result += `${index + 1}. ${buySell} | ${order.schemeName}\n`;
        if (order.customerBasketName) result += `   Basket: ${order.customerBasketName}\n`;
        result += `   Amount: ${formatCurrency(order.allotedAmt || order.amount || 0)}`;
        if (order.allotedUnits) result += ` | Units: ${parseFloat(order.allotedUnits).toFixed(4)}`;
        if (order.allotedNav) result += ` | NAV: ₹${parseFloat(order.allotedNav).toFixed(2)}`;
        result += '\n';
        if (order.orderNumber) result += `   Order #: ${order.orderNumber}`;
        if (order.folioNo) result += ` | Folio: ${order.folioNo}`;
        result += '\n\n';
      });
    }

    // Show pending orders (compact)
    if (pendingOrders.length > 0) {
      result += `⏳ Pending Orders (${pendingOrders.length})\n\n`;

      const limitedPending = pendingOrders.slice(0, Math.min(10, limit));
      limitedPending.forEach((order: any, index: number) => {
        const buySell = order.buySell === 'P' ? '📥 BUY' : '📤 SELL';
        result += `${index + 1}. ${buySell} | ${order.schemeName}\n`;
        if (order.customerBasketName) result += `   Basket: ${order.customerBasketName}\n`;
        result += `   Amount: ${formatCurrency(order.amount || 0)}`;
        if (order.orderNumber) result += ` | Order #: ${order.orderNumber}`;
        result += '\n';
        if (order.orderRemarks) result += `   Status: ${order.orderRemarks}\n`;
        result += '\n';
      });
    }

    // Show failed orders (compact)
    if (failedOrders.length > 0) {
      result += `❌ Failed Orders (${failedOrders.length})\n\n`;

      const limitedFailed = failedOrders.slice(0, Math.min(10, limit));
      limitedFailed.forEach((order: any, index: number) => {
        const buySell = order.buySell === 'P' ? '📥 BUY' : '📤 SELL';
        result += `${index + 1}. ${buySell} | ${order.schemeName}\n`;
        if (order.customerBasketName) result += `   Basket: ${order.customerBasketName}\n`;
        result += `   Amount: ${formatCurrency(order.amount || 0)}`;
        if (order.orderNumber) result += ` | Order #: ${order.orderNumber}`;
        result += '\n';
        if (order.orderRemarks) result += `   Reason: ${order.orderRemarks}\n`;
        result += '\n';
      });
    }

    if (orders.length > limit) {
      result += `📌 Showing limited results. Total orders: ${orders.length}\n`;
    }

    return result;
  } catch (error) {
    console.error('\n=== TRANSACTION HISTORY ERROR ===');
    console.error('Error:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Cancel an active SIP
 */
export async function cancelSIP(
  tokenManager: TokenManager,
  sipRegistrationNumber: string
): Promise<string> {
  try {
    const client = await createAuthenticatedClient(tokenManager);

    const response = await client.post<APIResponse>(
      CONFIG.ENDPOINTS.CANCEL_XSIP,
      { sipRegistrationNumber }
    );

    if (response.data.isError) {
      throw new Error(response.data.response?.message || 'SIP cancellation failed');
    }

    let result = `✅ SIP Cancellation Request Submitted\n\n`;
    result += `SIP Registration Number: ${sipRegistrationNumber}\n`;
    result += `\nYour SIP will be cancelled shortly.\n`;
    result += `Note: Any pending installments may still be processed.\n\n`;
    result += `💡 View SIPs: Use fabits_get_sips`;

    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`SIP cancellation failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get basket holdings - View investments organized by baskets
 */
export async function getBasketHoldings(tokenManager: TokenManager): Promise<string> {
  try {
    const client = await createAuthenticatedClient(tokenManager);

    console.error('\n=== BASKET HOLDINGS REQUEST ===');
    console.error('URL:', `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.BASKET_HOLDINGS}`);

    const response = await client.get<any>(
      CONFIG.ENDPOINTS.BASKET_HOLDINGS
    );

    console.error('\n=== BASKET HOLDINGS RESPONSE ===');
    console.error('Status:', response.status);
    console.error('Response Data (truncated):', JSON.stringify(response.data, null, 2).substring(0, 500) + '...');

    // Check response status
    if (response.data.status !== 'SUCCESS') {
      throw new Error(response.data.message || 'Failed to fetch basket holdings');
    }

    const holdings = response.data.holdings || [];

    if (holdings.length === 0) {
      return `🗂️  No Basket Holdings\n\n` +
        `You haven't invested in any baskets yet.\n\n` +
        `💡 Get started:\n` +
        `• View baskets: Use fabits_get_baskets\n` +
        `• Invest in basket: Use fabits_invest_basket`;
    }

    // Group holdings by basket
    const basketGroups = new Map<string, any[]>();
    holdings.forEach((holding: any) => {
      const basketName = holding.customerBasketName || 'Unknown Basket';
      if (!basketGroups.has(basketName)) {
        basketGroups.set(basketName, []);
      }
      basketGroups.get(basketName)!.push(holding);
    });

    // Calculate overall totals
    let totalInvested = 0;
    let totalCurrentValue = 0;

    holdings.forEach((holding: any) => {
      const invested = holding.netInvestedAmount || 0;
      const current = (holding.netUnits || 0) * (holding.currentNav || 0);
      totalInvested += invested;
      totalCurrentValue += current;
    });

    const totalReturns = totalCurrentValue - totalInvested;
    const totalReturnsPercentage = totalInvested > 0
      ? (totalReturns / totalInvested) * 100
      : 0;

    // Build result
    let result = `🗂️  Basket Holdings\n`;
    result += `${'='.repeat(50)}\n\n`;

    result += `💰 Overall Summary\n`;
    result += `Total Invested: ${formatCurrency(totalInvested)}\n`;
    result += `Current Value: ${formatCurrency(totalCurrentValue)}\n`;
    result += `Total Returns: ${formatCurrency(totalReturns)} (${formatPercentage(totalReturnsPercentage)})\n`;
    result += `Total Baskets: ${basketGroups.size}\n\n`;

    // Show each basket
    let basketIndex = 1;
    basketGroups.forEach((basketHoldings, basketName) => {
      // Calculate basket totals
      let basketInvested = 0;
      let basketCurrentValue = 0;

      basketHoldings.forEach((holding: any) => {
        const invested = holding.netInvestedAmount || 0;
        const current = (holding.netUnits || 0) * (holding.currentNav || 0);
        basketInvested += invested;
        basketCurrentValue += current;
      });

      const basketReturns = basketCurrentValue - basketInvested;
      const basketReturnsPercentage = basketInvested > 0
        ? (basketReturns / basketInvested) * 100
        : 0;

      const returnSign = basketReturns >= 0 ? '📈' : '📉';

      result += `${basketIndex}. ${basketName}\n`;
      result += `   ${returnSign} Invested: ${formatCurrency(basketInvested)} | `;
      result += `Current: ${formatCurrency(basketCurrentValue)}\n`;
      result += `   Returns: ${formatCurrency(basketReturns)} (${formatPercentage(basketReturnsPercentage)})\n`;
      result += `   Funds: ${basketHoldings.length}\n\n`;

      // Show individual holdings in basket
      basketHoldings.forEach((holding: any, idx: number) => {
        const invested = holding.netInvestedAmount || 0;
        const units = holding.netUnits || 0;
        const nav = holding.currentNav || 0;
        const current = units * nav;
        const returns = current - invested;
        const returnsPercentage = invested > 0 ? (returns / invested) * 100 : 0;
        const sign = returns >= 0 ? '📈' : '📉';

        result += `   ${idx + 1}. ${holding.schemeName}\n`;
        result += `      ${sign} Current: ${formatCurrency(current)} | Invested: ${formatCurrency(invested)}\n`;
        result += `      Returns: ${formatCurrency(returns)} (${formatPercentage(returnsPercentage)})\n`;
        result += `      Units: ${units.toFixed(4)} | NAV: ₹${nav.toFixed(2)}\n`;
        if (holding.bseSchemeCode) result += `      BSE Code: ${holding.bseSchemeCode}\n`;
        result += '\n';
      });

      basketIndex++;
    });

    result += `💡 Next actions:\n`;
    result += `• View all baskets: Use fabits_get_baskets\n`;
    result += `• View regular holdings: Use fabits_get_portfolio\n`;
    result += `• Transaction history: Use fabits_get_transactions`;

    return result;
  } catch (error) {
    console.error('\n=== BASKET HOLDINGS ERROR ===');
    console.error('Error:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch basket holdings: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get user's action plans (user-created baskets from action plan feature)
 */
export async function getActionPlans(tokenManager: TokenManager): Promise<string> {
  try {
    const client = await createAuthenticatedClient(tokenManager);

    console.error('\n=== ACTION PLANS REQUEST ===');
    console.error('URL:', `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.USER_BASKETS}`);

    const response = await client.get<any>(
      CONFIG.ENDPOINTS.USER_BASKETS
    );

    console.error('\n=== ACTION PLANS RESPONSE ===');
    console.error('Status:', response.status);
    console.error('Response Data (truncated):', JSON.stringify(response.data, null, 2).substring(0, 500) + '...');

    // Check response status
    if (response.data.status !== 'SUCCESS') {
      throw new Error(response.data.message || 'Failed to fetch action plans');
    }

    const allBaskets = response.data.data || [];

    // Filter for action plans only
    const actionPlans = allBaskets.filter((basket: any) => basket.createdSource === 'ACTION PLAN');

    if (actionPlans.length === 0) {
      return `📋 No Action Plans\n\n` +
        `You haven't created any action plans yet.\n\n` +
        `💡 Action plans help you organize investments for specific financial goals like:\n` +
        `• Emergency Fund\n` +
        `• Retirement Planning\n` +
        `• Children's Education\n` +
        `• General Savings\n\n` +
        `Create an action plan on the Fabits app to get started!`;
    }

    let result = `📋 Your Action Plans (Read-Only)\n`;
    result += `${'='.repeat(50)}\n\n`;
    result += `⚠️  Note: Action plans can only be created/modified in the Fabits app.\n`;
    result += `Via MCP, you can view plans and invest in them.\n\n`;
    result += `Total Plans: ${actionPlans.length}\n\n`;

    actionPlans.forEach((plan: any, index: number) => {
      const statusIcon = plan.basketStatus === 'DRAFT' ? '📝' :
        plan.oneTimeStatus === 'COMPLETED' ? '✅' :
          plan.oneTimeStatus === 'PENDING' ? '⏳' : '📊';

      result += `${index + 1}. ${statusIcon} ${plan.customerBasketName}\n`;
      result += `   Plan ID: ${plan.customerBasketInvestmentId}\n`;
      if (plan.universalBasketId) result += `   Universal Basket ID: ${plan.universalBasketId}\n`;
      result += `   Category: ${plan.category || 'N/A'}\n`;
      result += `   Status: ${plan.basketStatus}`;
      if (plan.oneTimeStatus) result += ` | One-Time: ${plan.oneTimeStatus}`;
      if (plan.sipStatus) result += ` | SIP: ${plan.sipStatus}`;
      result += '\n';

      // One-time investment breakdown
      const oneTimeAmount = plan.oneTimeInvestmentAmount || 0;
      if (oneTimeAmount > 0 && plan.oneTimeInvestmentBreakdown?.length > 0) {
        result += `   💰 One-Time Investment: ${formatCurrency(oneTimeAmount)}\n`;
        plan.oneTimeInvestmentBreakdown.forEach((fund: any, idx: number) => {
          result += `      ${idx + 1}. ${fund.schemeName || 'Unknown Fund'}\n`;
          result += `         Amount: ${formatCurrency(fund.investmentAmount)} (${fund.weightageOneTime || 0}%)\n`;
          result += `         Asset: ${fund.assetClass || 'N/A'} | BSE Code: ${fund.bseSchemeCode || 'N/A'}\n`;
        });
      }

      // SIP investment breakdown
      const sipAmount = plan.sipInvestmentAmount || 0;
      if (sipAmount > 0 && plan.sipInvestmentBreakdown?.length > 0) {
        result += `   📅 SIP Investment: ${formatCurrency(sipAmount)}/month\n`;
        plan.sipInvestmentBreakdown.forEach((fund: any, idx: number) => {
          result += `      ${idx + 1}. ${fund.schemeName || 'Unknown Fund'}\n`;
          result += `         Amount: ${formatCurrency(fund.investmentAmount)} (${fund.sipWeightage || 0}%)\n`;
          result += `         Asset: ${fund.assetClass || 'N/A'} | BSE Code: ${fund.bseSchemeCode || 'N/A'}\n`;
        });
      }

      if (plan.createdTimestamp) {
        result += `   Created: ${formatDate(plan.createdTimestamp)}\n`;
      }

      result += '\n';
    });

    result += `💡 Next steps:\n`;
    result += `• Invest in action plan: Use fabits_invest_basket with the Plan ID shown above\n`;
    result += `• View basket holdings: Use fabits_get_basket_holdings\n`;
    result += `• Check investments: Use fabits_get_portfolio`;

    return result;
  } catch (error) {
    console.error('\n=== ACTION PLANS ERROR ===');
    console.error('Error:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch action plans: ${error.message}`);
    }
    throw error;
  }
}
