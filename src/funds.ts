/**
 * Mutual Funds module for Fabits MCP Server
 * Handles fund search, details, and recommendations
 */

import { createAuthenticatedClient, TokenManager } from './auth.js';
import { CONFIG } from './config.js';
import { MutualFund, FundDetailsResponse, BSESIPData, APIResponse } from './types.js';

/**
 * Format returns for display
 */
function formatReturn(value: number | undefined): string {
  if (value === undefined || value === null) return 'N/A';
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

/**
 * Format currency for display
 */
function formatCurrency(value: number | undefined): string {
  if (value === undefined || value === null) return 'N/A';
  return `₹${value.toLocaleString('en-IN')}`;
}

/**
 * Search for mutual funds
 */
export async function searchFunds(
  tokenManager: TokenManager,
  query: string,
  limit: number = 10
): Promise<string> {
  try {
    const client = await createAuthenticatedClient(tokenManager);

    console.error('\n=== SEARCH FUNDS REQUEST ===');
    console.error('URL:', `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.ALL_FUNDS}`);
    console.error('Search Query:', query);

    const response = await client.get<any>(
      CONFIG.ENDPOINTS.ALL_FUNDS,
      {
        params: { search: query },
      }
    );

    console.error('\n=== SEARCH FUNDS RESPONSE ===');
    console.error('Status:', response.status);
    console.error('Response Data:', JSON.stringify(response.data, null, 2));

    if (response.data.status !== 'SUCCESS') {
      throw new Error(response.data.message || 'Failed to search funds');
    }

    const funds = response.data.funds || [];
    const totalItems = response.data.totalItems || 0;

    if (funds.length === 0) {
      return `No funds found matching "${query}"\n\nTry:\n- Different keywords\n- Fund house names (e.g., "HDFC", "SBI", "ICICI")\n- Categories (e.g., "equity", "debt", "hybrid")`;
    }

    // Limit results
    const limitedFunds = funds.slice(0, limit);

    let result = `🔍 Found ${totalItems} fund${totalItems > 1 ? 's' : ''} matching "${query}"`;
    result += totalItems > limit ? ` (showing top ${limit})` : '';
    result += '\n\n';

    limitedFunds.forEach((fund: any, index: number) => {
      result += `${index + 1}. ${fund.sName || fund.amfiName}\n`;
      result += `   Fund ID: ${fund.schemeCode}\n`;
      if (fund.bseSchemeCode) result += `   BSE Scheme Code: ${fund.bseSchemeCode}\n`;
      result += `   ISIN: ${fund.isin}\n`;
      if (fund.assetClass) result += `   Asset Class: ${fund.assetClass}\n`;

      // Returns
      const returns = [];
      if (fund.oneYrRet !== undefined && fund.oneYrRet !== null) returns.push(`1Y: ${formatReturn(fund.oneYrRet)}`);
      if (fund.threeYrRet !== undefined && fund.threeYrRet !== null) returns.push(`3Y: ${formatReturn(fund.threeYrRet)}`);
      if (fund.fiveYrRet !== undefined && fund.fiveYrRet !== null) returns.push(`5Y: ${formatReturn(fund.fiveYrRet)}`);
      if (returns.length > 0) result += `   Returns: ${returns.join(' | ')}\n`;

      // Risk
      if (fund.riskProfile) result += `   Risk: ${fund.riskProfile}\n`;

      // Minimum amounts
      const minAmounts = [];
      if (fund.minSipAmount) minAmounts.push(`SIP: ${formatCurrency(fund.minSipAmount)}`);
      if (fund.minInvt) minAmounts.push(`Lumpsum: ${formatCurrency(parseFloat(fund.minInvt))}`);
      if (minAmounts.length > 0) result += `   Min Investment: ${minAmounts.join(' | ')}\n`;

      result += '\n';
    });

    result += `💡 To invest via UPI, use BSE Scheme Code with fabits_invest_lumpsum_upi`;

    return result;
  } catch (error) {
    console.error('\n=== SEARCH FUNDS ERROR ===');
    console.error('Error:', error);

    // Check if it's a 500 error (likely no results or bad query)
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as any;
      if (axiosError.response?.status === 500) {
        throw new Error(
          `Fund search failed - no results found for "${query}". ` +
          `Try using shorter, more specific keywords:\n` +
          `- Instead of "equity funds", try "equity"\n` +
          `- Instead of "debt mutual funds", try "debt"\n` +
          `- Use AMC names: "HDFC", "SBI", "ICICI"\n` +
          `- Use single category words: "index", "hybrid", "liquid"`
        );
      }
    }

    if (error instanceof Error) {
      throw new Error(`Fund search failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get detailed information about a specific fund
 */
export async function getFundDetails(
  tokenManager: TokenManager,
  fundId: string
): Promise<string> {
  try {
    const client = await createAuthenticatedClient(tokenManager);

    console.error('\n=== FUND DETAILS REQUEST ===');
    console.error('Fund ID:', fundId);
    console.error('URLs:');
    console.error('  Main Info:', `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.FUND_MAIN_INFO}/${fundId}`);
    console.error('  General Info:', `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.FUND_GENERAL_INFO}/${fundId}`);
    console.error('  Chart Data:', `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.FUND_CHART}/${fundId}`);
    console.error('  SIP Data:', `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.BSE_SIP_DATA}/${fundId}`);

    // Fetch all fund information in parallel
    const [mainInfoRes, generalInfoRes, chartDataRes, sipDataRes] = await Promise.allSettled([
      client.get<APIResponse>(`${CONFIG.ENDPOINTS.FUND_MAIN_INFO}/${fundId}`),
      client.get<APIResponse>(`${CONFIG.ENDPOINTS.FUND_GENERAL_INFO}/${fundId}`),
      client.get<APIResponse>(`${CONFIG.ENDPOINTS.FUND_CHART}/${fundId}`),
      client.get<APIResponse>(`${CONFIG.ENDPOINTS.BSE_SIP_DATA}/${fundId}`),
    ]);

    console.error('\n=== FUND DETAILS RESPONSES ===');
    console.error('Main Info Status:', mainInfoRes.status);
    if (mainInfoRes.status === 'fulfilled') {
      console.error('Main Info Data:', JSON.stringify(mainInfoRes.value.data, null, 2).substring(0, 500) + '...');
    } else {
      console.error('Main Info Error:', mainInfoRes.reason);
    }

    console.error('General Info Status:', generalInfoRes.status);
    if (generalInfoRes.status === 'fulfilled') {
      console.error('General Info Data:', JSON.stringify(generalInfoRes.value.data, null, 2).substring(0, 300) + '...');
    }

    console.error('SIP Data Status:', sipDataRes.status);
    if (sipDataRes.status === 'fulfilled') {
      console.error('SIP Data:', JSON.stringify(sipDataRes.value.data, null, 2).substring(0, 300) + '...');
    }

    // Extract data
    const mainInfoData = mainInfoRes.status === 'fulfilled' ? mainInfoRes.value.data.data : null;
    const generalInfo = generalInfoRes.status === 'fulfilled' ? generalInfoRes.value.data.data : null;
    const sipData = sipDataRes.status === 'fulfilled' ? sipDataRes.value.data.data : null;

    // The fund data is primarily in generalInfo based on the API response
    if (!generalInfo && !mainInfoData) {
      throw new Error('Fund not found or invalid fund ID');
    }

    // Build detailed response - use generalInfo as primary source
    const info = generalInfo || mainInfoData || {};
    const fundName = info.sName || info.fundName || info.amfiName || `Fund ${fundId}`;

    // Extract mainInfo specific data
    const holdingsPortfolio = mainInfoData?.holdingsPortfolio || [];
    const assetClassDistribution = mainInfoData?.assetClassDistribution || [];
    const benchmarkData = mainInfoData?.benchmarkAbsoluteReturns || null;
    const mainInfoDetails = mainInfoData?.mainInfo?.[0] || {};

    let result = `📊 ${fundName}\n`;
    result += `${'='.repeat(fundName.length + 3)}\n\n`;

    // Basic Info
    result += `📌 Basic Information\n`;
    result += `Fund ID: ${fundId}\n`;
    if (info.schemeCode) result += `Scheme Code: ${info.schemeCode}\n`;
    if (info.bseSchemeCode) result += `BSE Scheme Code: ${info.bseSchemeCode}\n`;
    if (info.isin) result += `ISIN: ${info.isin}\n`;
    if (info.amcName) result += `AMC: ${info.amcName}\n`;
    if (info.category) result += `Category: ${info.category}`;
    if (info.subCategory) result += ` - ${info.subCategory}`;
    if (info.category || info.subCategory) result += '\n';
    if (info.typeCode) result += `Type: ${info.typeCode}\n`;
    if (info.nav) result += `Current NAV: ₹${info.nav.toFixed(2)} (${info.navDate || 'N/A'})\n`;
    if (info.riskProfile || info.riskLevel) result += `Risk Level: ${info.riskProfile || info.riskLevel}\n`;
    if (info.rating) result += `Rating: ${'⭐'.repeat(Math.min(info.rating, 5))}\n`;

    // Performance
    result += `\n📈 Performance (Annualized Returns)\n`;
    if (info.oneYrRet !== undefined) result += `1 Year: ${formatReturn(info.oneYrRet)}\n`;
    if (info.threeYrRet !== undefined) result += `3 Year: ${formatReturn(info.threeYrRet)}\n`;
    if (info.fiveYrRet !== undefined) result += `5 Year: ${formatReturn(info.fiveYrRet)}\n`;
    if (info.returns1Y !== undefined) result += `1 Year: ${formatReturn(info.returns1Y)}\n`;
    if (info.returns3Y !== undefined) result += `3 Year: ${formatReturn(info.returns3Y)}\n`;
    if (info.returns5Y !== undefined) result += `5 Year: ${formatReturn(info.returns5Y)}\n`;

    // Fund Details
    result += `\n💼 Fund Details\n`;
    if (info.fundManager || generalInfo?.fundManager) result += `Fund Manager: ${info.fundManager || generalInfo?.fundManager}\n`;
    if (info.expenseRatio || generalInfo?.expenseRatio || mainInfoDetails.expenseRatio) result += `Expense Ratio: ${info.expenseRatio || generalInfo?.expenseRatio || mainInfoDetails.expenseRatio}%\n`;
    if (info.exitLoad || generalInfo?.exitLoad || mainInfoDetails.exitLoadCondition) result += `Exit Load: ${info.exitLoad || generalInfo?.exitLoad || mainInfoDetails.exitLoadCondition}\n`;
    if (info.aum || generalInfo?.aum || mainInfoDetails.aum) {
      const aumValue = info.aum || generalInfo?.aum || mainInfoDetails.aum;
      result += `AUM: ${formatCurrency(aumValue)} Cr\n`;
    }
    if (info.launchDate || generalInfo?.launchDate) result += `Launch Date: ${info.launchDate || generalInfo?.launchDate}\n`;
    if (info.benchmark || generalInfo?.benchmark || benchmarkData?.symbol || mainInfoData?.benchmarkName) {
      result += `Benchmark: ${info.benchmark || generalInfo?.benchmark || benchmarkData?.symbol || mainInfoData?.benchmarkName}\n`;
    }

    // Investment Options
    result += `\n💰 Investment Options\n`;
    if (info.minSipAmount || info.minSIPAmount) result += `Min SIP Amount: ${formatCurrency(info.minSipAmount || info.minSIPAmount)}\n`;
    if (info.minInvt) result += `Min Lumpsum: ${formatCurrency(parseFloat(info.minInvt))}\n`;

    // SIP Dates if available
    if (sipData && sipData.sipDates && sipData.sipDates.length > 0) {
      result += `Available SIP Dates: ${sipData.sipDates.sort((a: number, b: number) => a - b).join(', ')}\n`;
    }

    // Asset Allocation
    if (assetClassDistribution.length > 0) {
      result += `\n📊 Asset Allocation\n`;
      assetClassDistribution.forEach((allocation: any) => {
        const assetType = allocation.equityType && allocation.equityType !== '-'
          ? `${allocation.asset} (${allocation.equityType})`
          : allocation.asset;
        result += `${assetType}: ${allocation.holdingPercentage.toFixed(2)}%\n`;
      });
    }

    // Top Holdings
    if (holdingsPortfolio.length > 0) {
      result += `\n🏢 Top 10 Holdings\n`;
      const topHoldings = holdingsPortfolio.slice(0, 10);
      topHoldings.forEach((holding: any, index: number) => {
        result += `${index + 1}. ${holding.companyName} - ${holding.holdingPercentage.toFixed(2)}%\n`;
        if (holding.sectorName) result += `   Sector: ${holding.sectorName}\n`;
      });
    }

    // Benchmark Comparison
    if (benchmarkData && mainInfoData?.benchmarkName) {
      result += `\n📈 Benchmark Performance (${mainInfoData.benchmarkName})\n`;
      if (benchmarkData.oneYearReturn !== undefined) result += `1 Year: ${formatReturn(benchmarkData.oneYearReturn)}\n`;
      if (benchmarkData.threeYearReturn !== undefined) result += `3 Year: ${formatReturn(benchmarkData.threeYearReturn)}\n`;
      if (benchmarkData.fiveYearReturn !== undefined) result += `5 Year: ${formatReturn(benchmarkData.fiveYearReturn)}\n`;
    }

    result += `\n💡 Next Steps:\n`;
    result += `- Invest lumpsum via UPI: Use fabits_invest_lumpsum_upi with BSE Scheme Code\n`;
    result += `- Start SIP: Use fabits_start_sip\n`;

    return result;
  } catch (error) {
    console.error('\n=== FUND DETAILS ERROR ===');
    console.error('Error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      throw new Error(`Failed to get fund details: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get Fabits recommended star funds
 */
export async function getStarFunds(tokenManager: TokenManager): Promise<string> {
  try {
    const client = await createAuthenticatedClient(tokenManager);

    console.error('\n=== STAR FUNDS REQUEST ===');
    console.error('URL:', `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.STAR_FUNDS}`);

    const response = await client.get<any>(
      CONFIG.ENDPOINTS.STAR_FUNDS
    );

    console.error('\n=== STAR FUNDS RESPONSE ===');
    console.error('Status:', response.status);
    console.error('Response Data:', JSON.stringify(response.data, null, 2));

    // Check response status
    if (response.data.status !== 'SUCCESS') {
      throw new Error(response.data.message || 'Failed to fetch star funds');
    }

    const funds = response.data.data || [];

    if (funds.length === 0) {
      return 'No recommended funds available at this time.';
    }

    let result = `⭐ Fabits Star Funds - Top Picks\n`;
    result += `${'='.repeat(35)}\n\n`;

    funds.forEach((fund: any, index: number) => {
      result += `${index + 1}. ${fund.sName || fund.amfiName}\n`;
      result += `   Fund ID: ${fund.schemeCode}\n`;
      if (fund.bseSchemeCode) result += `   BSE Scheme Code: ${fund.bseSchemeCode}\n`;
      result += `   ISIN: ${fund.isin}\n`;
      if (fund.assetClass) result += `   Asset Class: ${fund.assetClass}\n`;

      // Returns
      const returns = [];
      if (fund.oneYrRet !== undefined && fund.oneYrRet !== null) returns.push(`1Y: ${formatReturn(fund.oneYrRet)}`);
      if (fund.threeYrRet !== undefined && fund.threeYrRet !== null) returns.push(`3Y: ${formatReturn(fund.threeYrRet)}`);
      if (fund.fiveYrRet !== undefined && fund.fiveYrRet !== null) returns.push(`5Y: ${formatReturn(fund.fiveYrRet)}`);
      if (returns.length > 0) result += `   Returns: ${returns.join(' | ')}\n`;

      if (fund.riskProfile) result += `   Risk: ${fund.riskProfile}\n`;
      if (fund.minSipAmount) result += `   Min SIP: ${formatCurrency(fund.minSipAmount)}\n`;
      if (fund.minInvt) result += `   Min Lumpsum: ${formatCurrency(parseFloat(fund.minInvt))}\n`;

      result += '\n';
    });

    result += `💡 To invest via UPI, use BSE Scheme Code with fabits_invest_lumpsum_upi`;

    return result;
  } catch (error) {
    console.error('\n=== STAR FUNDS ERROR ===');
    console.error('Error:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch star funds: ${error.message}`);
    }
    throw error;
  }
}
