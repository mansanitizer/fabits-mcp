# Changelog

## Recent Updates

### Fund Details API Fix (Latest)

#### Bug Fix:
**Fixed `fabits_get_fund_details` error**: "Cannot read properties of undefined (reading 'length')"

**Root Cause:**
- The code expected `fundName` to be in `mainInfo` response
- The actual API returns fund name and details in `generalInfo` response
- `mainInfo` only contains `holdingsPortfolio` data
- Accessing `mainInfo.fundName.length` failed because `fundName` was undefined

**Solution:**
- Changed primary data source from `mainInfo` to `generalInfo`
- Added fallback logic: `info.sName || info.fundName || info.amfiName || 'Fund {id}'`
- Updated all field mappings to use actual API field names:
  - `oneYrRet`, `threeYrRet`, `fiveYrRet` (not `returns1Y`, etc.)
  - `riskProfile` (not `riskLevel`)
  - `minSipAmount`, `minInvt` (minimum investment amounts)
  - `schemeCode`, `isin`, `amcName`, `typeCode`
- Added comprehensive verbose logging for debugging
- Added proper null checks for all fields

**Now Working:**
```
📊 Parag Parikh Flexi Cap Fund - Regular Plan - Growth
======================================================

📌 Basic Information
Fund ID: 21520
Scheme Code: 21520
ISIN: INF879O01019
AMC: PPFAS Asset Management Pvt. Ltd.
Type: OPEN ENDED SCHEME
Risk Level: Very High

📈 Performance (Annualized Returns)
1 Year: +7.68%
3 Year: +77.78%
5 Year: +171.90%

💼 Fund Details

💰 Investment Options
Min SIP Amount: ₹1,000
Min Lumpsum: ₹1,000
```

### Basket Holdings Feature

#### New Tool Added:
**`fabits_get_basket_holdings`** - View basket investments organized by baskets
- Groups holdings by customer basket name
- Shows overall summary with total invested, current value, and returns
- Displays each basket with its performance metrics
- Lists individual fund holdings within each basket
- Calculates returns for each fund and basket
- Verbose logging for debugging
- Field mappings:
  - `customerBasketName`: Basket name
  - `schemeName`: Fund name within basket
  - `netInvestedAmount`: Amount invested in fund
  - `netUnits`: Number of units held
  - `currentNav`: Current NAV of fund
  - `bseSchemeCode`: BSE scheme code
  - `universalBasketId`: Basket identifier

#### Example Output:
```
🗂️ Basket Holdings
==================================================

💰 Overall Summary
Total Invested: ₹2,000
Current Value: ₹2,125.50
Total Returns: ₹125.50 (+6.28%)
Total Baskets: 3

1. Ashar's Jewellery Plan 1
   📈 Invested: ₹800 | Current: ₹850.25
   Returns: ₹50.25 (+6.28%)
   Funds: 2

   1. Nippon India Gold Savings Fund(G)
      📈 Current: ₹742.85 | Invested: ₹600
      Returns: ₹142.85 (+23.81%)
      Units: 15.8390 | NAV: ₹46.91
      BSE Code: RMFGDGP-GR
   ...
```

### Token Management & Session Features

#### New Tools Added:
1. **`fabits_refresh_token`** - Refresh expired access tokens
   - Uses the long-lived refresh token to get a new access token
   - Automatically handles token expiration (401/403 errors)
   - Verbose logging for debugging
   - Auto-clears tokens if refresh token is expired

2. **`fabits_logout`** - Logout and clear session
   - Attempts to call logout API endpoint
   - Always clears local tokens (even if API call fails)
   - Safe to use even when already logged out
   - Verbose logging for debugging

#### Enhanced Authentication:
- **Refresh Token Storage**: Now saves `refresh_token` received during OTP verification
- **Updated AuthToken Type**: Added `refreshToken?: string` field
- **New API Endpoints**: Added `/authserver/api/auth/refresh` and `/authserver/api/auth/logout`

#### Implementation Details:

**Refresh Token Flow:**
```
1. User gets 401/403 error (token expired)
2. Call fabits_refresh_token
3. Uses stored refresh_token to get new access_token
4. Updates stored tokens with new access_token
5. User can continue using the app
```

**Logout Flow:**
```
1. Call fabits_logout
2. Attempts API logout (optional, continues even if fails)
3. Clears local token storage
4. User must login again to continue
```

### Transaction History Updates

#### Enhanced `fabits_get_transactions`:
- **Dual Endpoint Support**: Tries basket orders first, falls back to regular orders
- **Compact Display**: Groups orders by status (Successful, Pending, Failed)
- **Summary Statistics**: Shows count breakdown at the top
- **Smart Limiting**: Different limits for different status groups
- **Field Mapping**: Correctly maps all basket order response fields
  - `buySell`: 'P' = Buy, else = Sell
  - `currentStatus`: COMPLETED, PENDING, FAILED
  - `schemeName`: Fund name
  - `customerBasketName`: Basket name
  - `allotedAmt`, `allotedUnits`, `allotedNav`: Allocation details
  - `orderNumber`, `folioNo`: Reference numbers

### Previous Updates

#### Authentication Fixes:
- Fixed OTP verification endpoint (`/authserver/api/auth/login/otp`)
- Updated LoginResponse type to match actual API response
- Added JWT decoding to extract user information
- Comprehensive verbose logging throughout auth flow

#### Fund Discovery Fixes:
- Updated `fabits_search_funds` to use correct response format
  - Changed from `data.data` to `data.funds`
  - Proper field mappings for fund data
- Updated `fabits_get_star_funds` to use correct response format
  - Changed status check from `isError` to `status === 'SUCCESS'`
  - Correct field mappings (`sName`, `oneYrRet`, etc.)

## File Changes

### Modified Files:
- `src/types.ts` - Added `refreshToken` to AuthToken interface
- `src/config.ts` - Added REFRESH_TOKEN and LOGOUT endpoints
- `src/auth.ts` - Added `refreshAccessToken()` and `logout()` functions
- `src/index.ts` - Added tool handlers for refresh and logout
- `src/portfolio.ts` - Enhanced `getTransactions()` with fallback logic
- `README.md` - Updated tool list

### API Endpoints Used:
```
POST /authserver/api/auth/login/otp - Verify OTP and login
POST /authserver/api/auth/refresh - Refresh access token
POST /authserver/api/auth/logout - Logout (optional)
GET  /mutualfundservice/api/basket/orderHistory - Basket orders
GET  /mutualfundservice/api/mutualFund/orderHistory - Regular orders (fallback)
```

## Testing

### Manual Testing Done:
✅ Logout function - Successfully clears local tokens
✅ Build process - No TypeScript errors
✅ MCP Server - Connected and running
✅ Tool registration - All new tools registered

### Pending Tests (Requires Valid Session):
⏳ Refresh token functionality (need valid refresh token)
⏳ Transaction history with basket orders
⏳ Complete login → refresh → logout flow

## Usage Examples

### Token Refresh
```
User: My session expired, can you refresh it?
Assistant: *calls fabits_refresh_token*
          ✅ Token Refreshed Successfully!
          Your session has been extended.
```

### Logout
```
User: Logout from Fabits
Assistant: *calls fabits_logout*
          ✅ Logged Out Successfully!
          Your session has been terminated.
```

### Transaction History
```
User: Show my transaction history
Assistant: *calls fabits_get_transactions*
          📜 Transaction History
          Total: 45 orders | ✅ 42 Success | ⏳ 2 Pending | ❌ 1 Failed

          ✅ Successful Orders (showing last 20)
          1. 📥 BUY | HDFC Equity Fund
             Basket: Balanced Growth
             Amount: ₹5,000 | Units: 156.2500 | NAV: ₹32.00
             Order #: ORD123456 | Folio: FOL789
          ...
```

## Next Steps

1. **Test with Fresh Login**: Login again to verify refresh token is saved
2. **Test Refresh Flow**: Wait for token expiration or force it, then test refresh
3. **Monitor Usage**: Check verbose logs for any issues
4. **Documentation**: Update user guides with new token management features
