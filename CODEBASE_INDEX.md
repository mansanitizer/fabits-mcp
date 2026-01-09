# Fabits MCP Codebase Index

> **Last Updated:** October 9, 2025  
> **Version:** 1.0.0  
> **Purpose:** Model Context Protocol server for Fabits MyWealth platform

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [File Structure](#file-structure)
4. [Core Modules](#core-modules)
5. [API Integration](#api-integration)
6. [Tool Catalog](#tool-catalog)
7. [Type Definitions](#type-definitions)
8. [Authentication Flow](#authentication-flow)
9. [Key Features](#key-features)
10. [Dependencies](#dependencies)
11. [Configuration](#configuration)
12. [Recent Changes](#recent-changes)

---

## 📖 Project Overview

**Fabits MCP Server** is a Model Context Protocol (MCP) implementation that enables AI assistants like Claude to interact with the Fabits MyWealth platform for mutual fund investments. It provides a conversational interface for:

- 🔐 **Authentication** - Secure login with OTP
- 🔍 **Fund Discovery** - Search and explore mutual funds
- 💰 **Investments** - Lumpsum, SIP, and basket investments
- 📊 **Portfolio Management** - Track holdings, SIPs, and transactions

**Production API:** `https://apimywealth.fabits.com`

---

## 🏗️ Architecture

```
┌─────────────────┐
│   AI Assistant  │ (Claude, etc.)
└────────┬────────┘
         │ MCP Protocol (stdio)
         ▼
┌─────────────────┐
│   MCP Server    │ (index.ts)
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌──────────┐
│ Tools  │ │ Token    │
│        │ │ Manager  │
└────┬───┘ └────┬─────┘
     │          │
     └────┬─────┘
          ▼
    ┌──────────────┐
    │ Fabits API   │
    │ (Production) │
    └──────────────┘
```

**Communication Flow:**
1. AI assistant sends tool requests via MCP protocol
2. MCP server validates authentication
3. Server makes authenticated API calls to Fabits
4. Responses formatted and returned to assistant

---

## 📁 File Structure

### Source Files (`src/`)

| File | Lines | Purpose | Key Exports |
|------|-------|---------|-------------|
| **index.ts** | 613 | MCP server entry point | Server setup, tool handlers |
| **auth.ts** | 416 | Authentication & token mgmt | TokenManager, requestOTP, verifyOTP |
| **config.ts** | 79 | Configuration & endpoints | CONFIG object |
| **types.ts** | 220 | TypeScript type definitions | All interface definitions |
| **funds.ts** | 295 | Fund search & discovery | searchFunds, getFundDetails |
| **invest.ts** | 699 | Investment operations | investLumpsum, startSIP, etc. |
| **portfolio.ts** | 485 | Portfolio & tracking | getPortfolio, getSIPs, etc. |

### Build Output (`build/`)

- Compiled JavaScript (`.js`)
- TypeScript declarations (`.d.ts`)
- Source maps (`.js.map`, `.d.ts.map`)

### Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | NPM package configuration |
| `tsconfig.json` | TypeScript compiler settings |
| `README.md` | User documentation |
| `CHANGELOG.md` | Version history & changes |
| `POSTMAN_COLLECTION_README.md` | API documentation |

### Postman Collections

- `Fabits_API_Collection.postman_collection.json`
- `Fabits_DEV_Environment.postman_environment.json`
- `Fabits_PROD_Environment.postman_environment.json`

---

## 🔧 Core Modules

### 1. Authentication Module (`auth.ts`)

**Class: TokenManager**
- Manages secure token storage in `~/.config/fabits-mcp/auth.json`
- In-memory caching for performance
- Methods:
  - `saveToken(token)` - Persist auth token
  - `loadToken()` - Retrieve stored token
  - `clearToken()` - Remove token
  - `requireToken()` - Get token or throw error

**Functions:**
- `requestOTP(phoneNumber)` - Send OTP to phone
- `verifyOTP(phoneNumber, otp, tokenManager)` - Verify OTP, login, store token
- `getAuthStatus(tokenManager)` - Check login & KYC status
- `refreshAccessToken(tokenManager)` - Refresh expired token
- `logout(tokenManager)` - Logout & clear tokens
- `createAuthenticatedClient(tokenManager)` - Create axios instance with auth

**Features:**
- JWT token decoding to extract user info
- Automatic token expiration handling
- Comprehensive error logging
- Refresh token support

### 2. Fund Discovery Module (`funds.ts`)

**Functions:**
- `searchFunds(tokenManager, query, limit)` - Search mutual funds by keyword
- `getFundDetails(tokenManager, fundId)` - Get comprehensive fund information
- `getStarFunds(tokenManager)` - Get Fabits curated recommendations

**Data Retrieved:**
- Fund name, category, AMC
- NAV, returns (1Y, 3Y, 5Y)
- Risk profile, ratings
- Min SIP/Lumpsum amounts
- Expense ratio, AUM
- Fund manager, benchmark

**Display Features:**
- Indian numeral formatting (₹)
- Return percentages with +/- signs
- Compact and detailed views

### 3. Investment Module (`invest.ts`)

**Functions:**
- `investLumpsum(tokenManager, fundId, amount)` - One-time investment
- `startSIP(tokenManager, fundId, monthlyAmount, sipDate, installments?)` - Start SIP
- `redeemFund(tokenManager, fundId, units?, amount?, type)` - Redeem funds
- `getAllBaskets(tokenManager)` - List investment baskets
- `investBasket(tokenManager, basketId, amount)` - Invest in basket
- `sendTransactionalOTP(tokenManager, phoneNumber, email)` - Send investment OTP
- `verifyTransactionalOTP(tokenManager, phoneNumber, otp)` - Verify OTP
- `investLumpsumUPI(...)` - Initiate UPI lumpsum investment
- `completeLumpsumUPI(...)` - Complete UPI investment after OTP

**Special Features:**
- UPI payment flow with status polling
- Basket allocation display
- E-mandate setup for SIPs
- Payment link generation

### 4. Portfolio Module (`portfolio.ts`)

**Functions:**
- `getPortfolio(tokenManager)` - View complete portfolio with holdings
- `getSIPs(tokenManager)` - List all SIPs (active/inactive)
- `getTransactions(tokenManager, limit)` - Transaction history
- `cancelSIP(tokenManager, sipRegistrationNumber)` - Cancel SIP
- `getBasketHoldings(tokenManager)` - View basket-organized holdings

**Display Features:**
- Portfolio summary (invested, current, returns)
- Returns with percentage and absolute values
- Transaction grouping by status
- Basket-wise holdings breakdown
- Indian currency formatting

---

## 🌐 API Integration

### Base Configuration
```typescript
BASE_URL: 'https://apimywealth.fabits.com'
TOKEN_FILE: '~/.config/fabits-mcp/auth.json'
REQUEST_TIMEOUT: 30000ms
```

### Endpoint Categories

#### Authentication Endpoints
```
POST /customerservice/v2/api/customer/validate        # Request OTP
POST /authserver/api/auth/login/otp                   # Verify OTP & Login
POST /authserver/api/auth/refresh                     # Refresh Token
POST /authserver/api/auth/logout                      # Logout
GET  /customerservice/api/hyperverge/checkKycInitiated # KYC Status
```

#### Mutual Funds Endpoints
```
GET  /mutualfundservice/api/mfData/allFunds          # Search Funds
GET  /mutualfundservice/api/mfData/mainInfo/:id      # Fund Main Info
GET  /mutualfundservice/api/mfData/generalInfo/:id   # Fund General Info
GET  /mutualfundservice/api/mfData/chartData/:id     # Fund Chart Data
GET  /mutualfundservice/api/mfData/bseSIPData/:id    # SIP Data
GET  /mutualfundservice/api/mfData/fabStarFunds      # Star Funds
```

#### Orders Endpoints
```
POST /mutualfundservice/api/bseStar/mfOrder/order         # Place Order
POST /mutualfundservice/api/bseStar/mfOrder/redeemOrder   # Redeem Order
POST /mutualfundservice/api/mutualFund/sendTransactionalOtp    # Send OTP
POST /mutualfundservice/api/mutualFund/verifyTransactionalOtp  # Verify OTP
POST /mutualfundservice/api/bseStar/api/oneTimePayment    # UPI Payment
POST /mutualfundservice/api/bseStar/mfUpload/paymentStatus # Payment Status
```

#### Baskets Endpoints
```
GET  /mutualfundservice/api/basket                   # All Baskets
POST /mutualfundservice/api/basket/oneTimeOrder      # Basket Investment
GET  /mutualfundservice/api/basket/holdings          # Basket Holdings
GET  /mutualfundservice/api/basket/orderHistory      # Basket Orders
```

#### Portfolio Endpoints
```
GET  /mutualfundservice/api/mutualFund/holdings      # Holdings
GET  /mutualfundservice/api/mutualFund/orderHistory  # Order History
GET  /planservice/api/portfolio/sips                 # User SIPs
POST /mutualfundservice/api/bseStar/api/XSIPCancellation # Cancel SIP
GET  /customerservice/api/customer/bankDetails/v2    # Bank Details
```

---

## 🛠️ Tool Catalog

### Authentication Tools (5)

| Tool Name | Purpose | Required Params |
|-----------|---------|-----------------|
| `fabits_request_otp` | Step 1: Request OTP | phone_number |
| `fabits_verify_otp` | Step 2: Verify OTP & login | phone_number, otp |
| `fabits_status` | Check auth & KYC status | - |
| `fabits_refresh_token` | Refresh expired token | - |
| `fabits_logout` | Logout & clear session | - |

### Fund Discovery Tools (3)

| Tool Name | Purpose | Required Params |
|-----------|---------|-----------------|
| `fabits_search_funds` | Search mutual funds | query, [limit] |
| `fabits_get_fund_details` | Get fund details | fund_id |
| `fabits_get_star_funds` | Get recommendations | - |

### Investment Tools (9)

| Tool Name | Purpose | Required Params |
|-----------|---------|-----------------|
| `fabits_invest_lumpsum` | One-time investment | fund_id, amount |
| `fabits_start_sip` | Start monthly SIP | fund_id, monthly_amount, sip_date, [installments] |
| `fabits_redeem` | Sell fund units | fund_id, [units/amount], [redemption_type] |
| `fabits_get_baskets` | List investment baskets | - |
| `fabits_invest_basket` | Invest in basket | basket_id, amount |
| `fabits_send_transactional_otp` | Send investment OTP | phone_number, email |
| `fabits_verify_transactional_otp` | Verify investment OTP | phone_number, otp |
| `fabits_invest_lumpsum_upi` | Initiate UPI investment | scheme_code, amount, upi_id, phone_number, email |
| `fabits_complete_lumpsum_upi` | Complete UPI investment | scheme_code, amount, upi_id, phone_number |

### Portfolio Tools (5)

| Tool Name | Purpose | Required Params |
|-----------|---------|-----------------|
| `fabits_get_portfolio` | View complete portfolio | - |
| `fabits_get_sips` | List all SIPs | - |
| `fabits_get_transactions` | Transaction history | [limit] |
| `fabits_cancel_sip` | Cancel active SIP | sip_registration_number |
| `fabits_get_basket_holdings` | View basket holdings | - |

**Total: 22 Tools**

---

## 📐 Type Definitions

### Authentication Types
```typescript
interface AuthToken {
  token: string;
  refreshToken?: string;
  phoneNumber: string;
  expiresAt?: string;
  clientCode?: string;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface KYCStatusResponse {
  status: string;
  data: {
    kycInitiated: boolean;
    kycCompleted: boolean;
    kycStatus?: string;
  };
}
```

### Mutual Fund Types
```typescript
interface MutualFund {
  fundId: string;
  fundName: string;
  schemeCode: string;
  isinCode?: string;
  category?: string;
  nav?: number;
  returns1Y?: number;
  returns3Y?: number;
  returns5Y?: number;
  riskLevel?: string;
  minSIPAmount?: number;
  minLumpsumAmount?: number;
}
```

### Order Types
```typescript
interface PlaceOrderRequest {
  fundId: string;
  amount: number;
  orderType: 'PURCHASE' | 'REDEMPTION';
  transactionMode: 'LUMPSUM' | 'SIP';
  sipDate?: number;
  sipFrequency?: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  installments?: number;
}

interface Holding {
  fundId: string;
  fundName: string;
  units: number;
  avgNav: number;
  currentNav: number;
  investedValue: number;
  currentValue: number;
  returns: number;
  returnsPercentage: number;
}

interface SIP {
  sipRegistrationNumber: string;
  fundId: string;
  fundName: string;
  amount: number;
  sipDate: number;
  frequency: string;
  startDate: string;
  installmentsPaid: number;
  status: 'ACTIVE' | 'CANCELLED' | 'COMPLETED';
}
```

### Basket Types
```typescript
interface Basket {
  basketId: string;
  basketName: string;
  description: string;
  category: string;
  riskLevel: string;
  minAmount: number;
  expectedReturns?: number;
  funds: {
    fundId: string;
    fundName: string;
    allocation: number; // percentage
  }[];
}
```

---

## 🔐 Authentication Flow

### Initial Login Flow
```
1. User provides phone number
   ↓
2. Call fabits_request_otp
   → POST /customerservice/v2/api/customer/validate
   → OTP sent to phone
   ↓
3. User provides OTP
   ↓
4. Call fabits_verify_otp
   → POST /authserver/api/auth/login/otp
   → Receives access_token & refresh_token
   → Decodes JWT to extract user info
   → Saves to ~/.config/fabits-mcp/auth.json
   ↓
5. User is authenticated
```

### Token Storage Format
```json
{
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "phoneNumber": "+917378666101",
  "clientCode": "fab3680",
  "expiresAt": "2025-10-10T12:00:00Z"
}
```

### Token Refresh Flow
```
1. API returns 401/403 (token expired)
   ↓
2. Call fabits_refresh_token
   → POST /authserver/api/auth/refresh
   → Uses stored refresh_token
   → Receives new access_token
   → Updates stored token
   ↓
3. Retry original request
```

### KYC Status Check
```
After login:
→ GET /customerservice/api/hyperverge/checkKycInitiated
→ Returns: kycCompleted, kycInitiated, kycStatus
→ User must complete KYC to invest
```

---

## ✨ Key Features

### 1. Security & Token Management
- ✅ Secure token storage with file-based persistence
- ✅ In-memory caching for performance
- ✅ Automatic token refresh on expiration
- ✅ JWT decoding for user info extraction
- ✅ Session management (login/logout)

### 2. Investment Workflows

#### Lumpsum Investment (UPI)
```
1. Search funds → Get BSE Scheme Code
2. Send transactional OTP
3. Verify OTP
4. Place order (BSE API)
5. Initiate UPI payment
6. Poll payment status (up to 5 minutes)
7. Confirm success/failure
```

#### SIP Creation
```
1. Search funds
2. Get BSE SIP data (available dates)
3. Place SIP order
4. Setup e-mandate
5. SIP activation
```

#### Basket Investment
```
1. Get available baskets
2. View fund allocation
3. Invest total amount
4. Auto-allocation across funds
```

### 3. Portfolio Tracking
- **Holdings View**: Current value, returns, NAV tracking
- **SIP Management**: Active/inactive SIPs, installment tracking
- **Transaction History**: Grouped by status (success/pending/failed)
- **Basket Holdings**: Organized by basket with fund-level details

### 4. Error Handling
- Comprehensive error messages
- API error propagation
- Fallback mechanisms (e.g., basket orders → regular orders)
- Verbose logging to stderr for debugging

### 5. Data Formatting
- **Currency**: Indian rupee format (₹1,23,456.78)
- **Percentages**: With +/- signs (+12.34%)
- **Dates**: Localized Indian format
- **Returns**: Color indicators (📈/📉)

---

## 📦 Dependencies

### Runtime Dependencies
```json
{
  "@modelcontextprotocol/sdk": "^1.0.4",  // MCP protocol implementation
  "axios": "^1.7.9",                       // HTTP client
  "zod": "^3.24.1"                         // Schema validation
}
```

### Development Dependencies
```json
{
  "@types/node": "^22.10.5",     // Node.js type definitions
  "typescript": "^5.7.3"          // TypeScript compiler
}
```

### TypeScript Configuration
```json
{
  "target": "ES2022",
  "module": "Node16",
  "moduleResolution": "Node16",
  "strict": true,
  "esModuleInterop": true,
  "resolveJsonModule": true
}
```

---

## ⚙️ Configuration

### Environment Variables
Currently uses hardcoded production configuration. No environment variables required.

### File Paths
```typescript
TOKEN_FILE: '~/.config/fabits-mcp/auth.json'  // Auth token storage
```

### API Configuration
```typescript
BASE_URL: 'https://apimywealth.fabits.com'
REQUEST_TIMEOUT: 30000  // 30 seconds
```

### MCP Server Configuration
```json
// claude_desktop_config.json
{
  "mcpServers": {
    "fabits": {
      "command": "fabits-mcp"
    }
  }
}
```

---

## 📝 Recent Changes

### Latest Updates (from CHANGELOG.md)

#### Fund Details API Fix
- **Fixed**: "Cannot read properties of undefined" error
- **Root Cause**: Expected data in `mainInfo` but was in `generalInfo`
- **Solution**: Changed primary data source, added fallback logic
- **Field Mappings Updated**:
  - `oneYrRet`, `threeYrRet`, `fiveYrRet` (not `returns1Y`)
  - `riskProfile` (not `riskLevel`)
  - `minSipAmount`, `minInvt`

#### Basket Holdings Feature
- **New Tool**: `fabits_get_basket_holdings`
- Groups holdings by basket
- Shows individual fund performance within baskets
- Calculates returns at both fund and basket level

#### Token Management
- **New Tools**: `fabits_refresh_token`, `fabits_logout`
- Refresh token storage and usage
- Automatic token expiration handling
- Session termination support

#### Transaction History Enhancement
- Dual endpoint support (basket orders → regular orders fallback)
- Compact display with status grouping
- Summary statistics
- Smart limiting by status

---

## 🚀 Usage Patterns

### Typical User Flows

#### 1. First-Time Investment
```
User: "I want to invest in mutual funds"
→ fabits_status (check login)
→ fabits_request_otp (if not logged in)
→ fabits_verify_otp (complete login)
→ fabits_search_funds (find funds)
→ fabits_get_fund_details (research)
→ fabits_invest_lumpsum_upi (invest)
→ fabits_complete_lumpsum_upi (complete payment)
```

#### 2. Portfolio Review
```
User: "How is my portfolio doing?"
→ fabits_get_portfolio (view holdings)
→ fabits_get_sips (check SIPs)
→ fabits_get_transactions (transaction history)
```

#### 3. SIP Setup
```
User: "Start a SIP of ₹5000 in HDFC Equity"
→ fabits_search_funds (find fund)
→ fabits_get_fund_details (check SIP dates)
→ fabits_start_sip (create SIP)
→ (e-mandate setup link provided)
```

---

## 🔍 Debugging & Logging

### Verbose Logging
All modules use `console.error()` for debugging output (doesn't interfere with MCP stdio):

```typescript
console.error('\n=== VERIFY OTP REQUEST ===');
console.error('URL:', url);
console.error('Request Body:', JSON.stringify(requestData, null, 2));
```

### Common Debug Patterns
1. **Request logging**: URL, headers, body
2. **Response logging**: Status, data (truncated if large)
3. **Error logging**: Full error details with stack traces
4. **Token logging**: First 20 chars only (security)

### Error Handling Strategy
```typescript
try {
  // API call
} catch (error) {
  if (axios.isAxiosError(error)) {
    // Extract API error message
    const message = error.response?.data?.message || error.message;
    throw new Error(`Operation failed: ${message}`);
  }
  throw error;
}
```

---

## 📊 Statistics

- **Total Files**: 7 TypeScript source files
- **Total Lines of Code**: ~2,800 lines
- **Total Tools**: 22 MCP tools
- **API Endpoints**: 30+ endpoints integrated
- **Type Definitions**: 20+ interfaces

---

## 🔗 Related Documentation

- [README.md](README.md) - User documentation
- [CHANGELOG.md](CHANGELOG.md) - Version history
- [POSTMAN_COLLECTION_README.md](POSTMAN_COLLECTION_README.md) - API docs
- [MCP Protocol Docs](https://modelcontextprotocol.io) - MCP specification

---

## 📄 License

MIT License

---

**Built with ❤️ for the MCP ecosystem**


