# Portfolio API Integration Test

This script tests the `fabits_get_portfolio` function with real API calls to validate the bearer token authentication and API integration.

## Prerequisites

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Authenticate first** (if not already):
   You must be logged in with valid tokens. Use the MCP server:
   ```bash
   # Start MCP server in another terminal
   node build/server.js

   # Then authenticate:
   # - fabits_request_otp <phone>
   # - fabits_verify_otp <otp>
   ```

## Running the Test

```bash
node scripts/test-portfolio.js
```

## What It Tests

✅ Token loading from auth file  
✅ Bearer token authentication  
✅ Real API call to `/mutualfundservice/api/mutualFund/holdings`  
✅ Response parsing and data processing  
✅ Separation of Fabits vs External holdings  
✅ Portfolio totals calculation  
✅ Error handling

## Expected Output

```
🧪 Testing Portfolio API Integration

📂 Loading authentication tokens...
✅ Tokens loaded successfully!
   Phone: +91XXXXXXXXXX
   Client Code: XXXXX
   Access Token: eyJhbGciOiJIUzI1NiIs...
   Refresh Token: eyJhbGciOiJIUzI1NiIs...

📊 Fetching portfolio with real API call...

============================================================
🔍 PORTFOLIO API REQUEST
============================================================
📡 Endpoint: https://apimywealth.fabits.com/mutualfundservice/api/mutualFund/holdings
🔑 Using Bearer Token Authentication
⏰ Request Time: 2026-01-10T...

✅ Response received in XXXms
📊 Status Code: 200
📦 Response Headers: { ... }

📄 Response Preview (first 800 chars):
{ ... }

📋 Data Structure Analysis:
   - Type: Array
   - Length: X items
   ✓ Parsed as direct array

📊 Holdings Summary:
   - Total holdings found: X
   - Fabits managed: X
   - External linked: X

💰 Portfolio Totals:
   - Total Invested: ₹XXX.XX
   - Current Value: ₹XXX.XX
   - Returns: ₹XXX.XX (XX.XX%)
============================================================

============================================================
📋 PORTFOLIO RESULT
============================================================

📊 Your Portfolio Overview
==================================================

💰 Total Net Worth
Current Value: ₹XXX.XX
Total Invested: ₹XXX.XX
Total Returns: ₹XXX.XX (+XX.XX%)

🚀 Fabits Investments (X)
   Value: ₹XXX.XX | Returns: ₹XXX.XX (+XX.XX%)
   ----------------------------------------
   1. Fund Name Here
      📈 Current: ₹XXX.XX | Invested: ₹XXX.XX
      Returns: ₹XXX.XX (+XX.XX%)
      Units: X.XXX | NAV: ₹XX.XX
   ...

============================================================

✅ Portfolio API integration test PASSED!

The portfolio function successfully:
  ✓ Authenticated with bearer token
  ✓ Made real API call to holdings endpoint
  ✓ Parsed and processed the response
  ✓ Returned formatted portfolio data
```

## Troubleshooting

### ❌ Error: No authentication tokens found
**Solution:** You need to login first via the MCP server

### ❌ Error: Failed to fetch portfolio: 401 Unauthorized
**Solution:** Your token has expired. The function should auto-refresh, but if it fails, login again

### ❌ Error: ECONNREFUSED
**Solution:** Check your internet connection and that the API is accessible

## Debugging

The script outputs detailed logs to stderr including:
- Full request details
- Response headers and preview
- Data structure analysis
- Parsing steps
- Error stack traces

These logs help diagnose any issues with the API integration.

## What This Validates

This test proves that:
1. ✅ Bearer token is properly attached to requests
2. ✅ API endpoint is correct and accessible
3. ✅ Response format is as expected
4. ✅ Data parsing logic works with real data
5. ✅ Error handling catches edge cases
6. ✅ Token auto-refresh works (if tested with expired token)

## Next Steps

After this test passes, you can use the portfolio tool via:
- MCP server tool calls
- n8n workflows
- Any MCP client
