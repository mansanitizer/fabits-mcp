# Fabits MCP Server

A Model Context Protocol (MCP) server for [Fabits MyWealth](https://apimywealth.fabits.com) platform. Invest in mutual funds through natural conversation with AI assistants like Claude.

## Features

🔐 **Authentication** - Secure login with phone + OTP, automatic token management
🔍 **Fund Discovery** - Search funds, get details, view recommendations
💰 **Investments** - Lumpsum, SIP, basket investments
📊 **Portfolio Tracking** - View holdings, SIPs, transaction history
🎯 **Production Ready** - Direct integration with Fabits production API

## Available Tools

### Authentication
- `fabits_request_otp` - Step 1: Request OTP to be sent to phone
- `fabits_verify_otp` - Step 2: Verify OTP and complete login
- `fabits_status` - Check authentication and KYC status
- `fabits_refresh_token` - Refresh expired access token using refresh token
- `fabits_logout` - Logout and clear stored tokens

### Fund Discovery
- `fabits_search_funds` - Search mutual funds by name/category
- `fabits_get_fund_details` - Get comprehensive fund information
- `fabits_get_star_funds` - Get Fabits recommended funds

### Investments
- `fabits_invest_lumpsum` - One-time investment
- `fabits_start_sip` - Start monthly SIP
- `fabits_redeem` - Sell mutual fund units
- `fabits_get_baskets` - View investment baskets
- `fabits_invest_basket` - Invest in diversified baskets

### Portfolio
- `fabits_get_portfolio` - View complete portfolio
- `fabits_get_basket_holdings` - View basket holdings organized by baskets
- `fabits_get_sips` - List active SIPs
- `fabits_get_transactions` - View transaction history
- `fabits_cancel_sip` - Cancel SIP

## Installation

### Option 1: NPM Package (Recommended)

```bash
npm install -g fabits-mcp
```

### Option 2: From Source

```bash
# Clone repository
git clone <repository-url>
cd fabits-mcp

# Install dependencies
npm install

# Build
npm run build
```

## Configuration

### Claude Desktop

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "fabits": {
      "command": "fabits-mcp"
    }
  }
}
```

Or if running from source:

```json
{
  "mcpServers": {
    "fabits": {
      "command": "node",
      "args": ["/path/to/fabits-mcp/build/index.js"]
    }
  }
}
```

### Other MCP Clients

Use the built executable:
```bash
node /path/to/fabits-mcp/build/index.js
```

## Usage Examples

### 1. Login Flow

```
User: Login to Fabits
Assistant: *calls fabits_status* You're not logged in.
          What's your phone number?
User: +917378666101
Assistant: *calls fabits_request_otp with phone*
          📱 OTP sent to your phone! Please provide the OTP.
User: The OTP is 123456
Assistant: *calls fabits_verify_otp with phone and OTP*
          ✅ Login successful! Your KYC is completed. You can start investing.
```

### 2. Search and Invest

```
User: Find good tax-saving funds
Assistant: *calls fabits_search_funds with query="tax saving ELSS"*
          Found 15 tax-saving funds. Top picks:
          1. HDFC Tax Saver - 1Y: +12.5%, 3Y: +18.2%
          2. Axis Long Term Equity - 1Y: +14.1%, 3Y: +17.9%
          ...

User: Tell me more about fund 1
Assistant: *calls fabits_get_fund_details*
          HDFC Tax Saver (Fund ID: ABC123)
          - Category: ELSS
          - Risk: Moderately High
          - Min SIP: ₹500
          - Returns: 1Y: +12.5%, 3Y: +18.2%, 5Y: +15.6%
          - Expense Ratio: 1.2%

User: Start a SIP of 5000 per month on the 5th
Assistant: *calls fabits_start_sip with fund_id, amount=5000, date=5*
          ✅ SIP Started!
          Monthly: ₹5,000 on 5th of every month
          Please complete e-mandate setup: [link]
```

### 3. Portfolio Tracking

```
User: Show my portfolio
Assistant: *calls fabits_get_portfolio*
          📊 Your Portfolio
          Total Invested: ₹1,50,000
          Current Value: ₹1,65,250
          Total Returns: ₹15,250 (+10.17%)

          Holdings:
          1. HDFC Tax Saver: ₹55,400 (+10.8%)
          2. Axis Bluechip: ₹48,650 (+8.5%)
          ...
```

## Security

- **Token Storage**: Encrypted tokens stored in `~/.config/fabits-mcp/auth.json`
- **Production API**: Direct connection to `https://apimywealth.fabits.com`
- **No Data Logging**: No transaction or personal data is logged by the MCP server
- **Session Management**: Tokens auto-expire and require re-authentication

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode (auto-rebuild on changes)
npm run watch

# Test locally
node build/index.js
```

## Project Structure

```
fabits-mcp/
├── src/
│   ├── index.ts          # MCP server entry point
│   ├── config.ts         # Configuration & API endpoints
│   ├── types.ts          # TypeScript type definitions
│   ├── auth.ts           # Authentication & token management
│   ├── funds.ts          # Fund search & discovery
│   ├── invest.ts         # Investment operations
│   └── portfolio.ts      # Portfolio & tracking
├── build/                # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

## API Coverage

Based on [Fabits API Collection](./Fabits_API_Collection.postman_collection.json):

- ✅ Authentication (Login, KYC Status)
- ✅ Mutual Funds (Search, Details, Star Funds)
- ✅ Orders (Lumpsum, SIP, Redemption)
- ✅ Baskets (List, Invest)
- ✅ Portfolio (Holdings, SIPs, Transactions)
- ⏳ Risk Assessment (Planned)
- ⏳ Plans & Goals (Planned)
- ⏳ Mandates & Payments (Partial)

## Troubleshooting

### "Not authenticated" error
Re-login using `fabits_request_otp` followed by `fabits_verify_otp`. Tokens may expire after 24 hours.

### "KYC not completed" error
Complete KYC on the Fabits app before investing through MCP.

### Build errors
```bash
rm -rf build node_modules
npm install
npm run build
```

### Connection issues
Verify internet connection. The server connects to production Fabits API.

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests if applicable
4. Submit a pull request

## License

MIT

## Disclaimer

⚠️  **Investment Warning**

- This tool connects to **PRODUCTION** Fabits API
- All investments are **REAL** and use **LIVE MONEY**
- Mutual fund investments are subject to market risks
- Past performance does not guarantee future returns
- Please read all scheme documents carefully before investing
- The developers are not responsible for investment decisions or losses

## Support

- 📧 Issues: [GitHub Issues](https://github.com/your-repo/issues)
- 📚 Fabits API Docs: See `POSTMAN_COLLECTION_README.md`
- 💬 MCP Protocol: [MCP Documentation](https://modelcontextprotocol.io)

---

**Built with ❤️  for the MCP ecosystem**
