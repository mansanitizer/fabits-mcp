# Fabits MyWealth API - Postman Collection

## 📋 Overview

This comprehensive Postman collection contains all REST API endpoints used in the Fabits MyWealth React application. The collection is organized by feature modules for easy navigation and testing.

## 📦 Files Included

1. **Fabits_API_Collection.postman_collection.json** - Main API collection with all endpoints
2. **Fabits_DEV_Environment.postman_environment.json** - Development environment variables
3. **Fabits_PROD_Environment.postman_environment.json** - Production environment variables

## 🚀 How to Import

### Step 1: Import Collection

1. Open Postman
2. Click **Import** button (top left)
3. Select `Fabits_API_Collection.postman_collection.json`
4. Click **Import**

### Step 2: Import Environments

1. Click on **Environments** tab (left sidebar)
2. Click **Import**
3. Select both environment files:
   - `Fabits_DEV_Environment.postman_environment.json`
   - `Fabits_PROD_Environment.postman_environment.json`
4. Click **Import**

### Step 3: Select Environment

1. From the top-right dropdown, select either:
   - **Fabits MyWealth - DEV** (for UAT testing)
   - **Fabits MyWealth - PROD** (for production)

## 🔑 Authentication Setup

### Getting Your Auth Token

1. First, use the **Authentication → Login - Validate User** endpoint to get your token
2. Copy the token from the response
3. Go to your selected Environment
4. Update the `auth_token` variable with your token
5. The token will automatically be included in all authenticated requests via Bearer token

**Note:** Most endpoints require authentication. The collection is configured to use `{{auth_token}}` automatically.

## 📚 API Modules

### 1. **Authentication** (4 endpoints)

- Login & validate user
- Sign up new user
- Check KYC status
- Fetch customer KYC statuses

### 2. **Mutual Funds** (9 endpoints)

- Get all funds / Search funds
- Get fund details, chart data, and general info
- Get BSE SIP data
- Get Fabits star funds
- Recently viewed funds management

### 3. **Mutual Fund Orders** (6 endpoints)

- Get active SIPs
- Get holdings
- Get order history
- Place orders (lumpsum/SIP)
- Redeem orders
- Verify transactional OTP

### 4. **Mutual Fund Baskets** (7 endpoints)

- Get all baskets
- Get user-created baskets
- Get basket holdings & order history
- Place basket orders (single & multi-basket)
- Get subsequent one-time orders

### 5. **SIPs Management** (3 endpoints)

- Get user SIPs
- Cancel XSIP
- Cancel action plan XSIP

### 6. **Payments & Mandates** (4 endpoints)

- Get e-mandate auth URL
- Get mandate details
- Update payment status
- Create one-time payment

### 7. **Portfolio & Holdings** (4 endpoints)

- Get holdings (by basket/symbol)
- Get order details
- Get holdings order history

### 8. **Plans & Goals** (8 endpoints)

- Get/Delete user plans
- Get investment boxes
- Financial fitness questionnaire & report
- Insurance URL
- Create proto first plan

### 9. **Risk Assessment** (2 endpoints)

- Get risk assessment questions
- Get risk profile

### 10. **Customer Account** (5 endpoints)

- Get bank details
- Get journey message
- Get/mark notifications
- Get carousel content

## 🔧 Environment Variables

### Base Variables

- `base_url` - API base URL (auto-configured per environment)
- `auth_token` - Your authentication token (set after login)

### Dynamic Variables (Update as needed)

- `phone_number` - User phone number
- `fund_id` - Mutual fund ID
- `basket_id` - Basket ID
- `plan_id` - Plan ID
- `order_id` - Order ID
- `client_code` - BSE client code
- `sip_registration_number` - SIP registration number
- `mandate_id` - E-mandate ID
- `notification_id` - Notification ID
- `search_query` - Search keyword

## 🌐 Environments

### DEV Environment

- **Base URL:** `https://apiuat-mywealth.fabits.com`
- **Purpose:** Development and UAT testing
- **Data:** Uses test data

### PROD Environment

- **Base URL:** `https://apimywealth.fabits.com`
- **Purpose:** Production environment
- **Data:** Uses live data ⚠️ **Use with caution!**

## 📝 Usage Examples

### Example 1: Login Flow

1. Use **Authentication → Login - Validate User**
2. Copy the `token` from response
3. Update environment variable `auth_token`
4. All subsequent requests will use this token

### Example 2: Search Mutual Funds

1. Ensure you're authenticated
2. Go to **Mutual Funds → Search Mutual Funds**
3. The request uses `{{search_query}}` variable (default: "hdfc")
4. Update the variable in environment or directly in request

### Example 3: Place an Order

1. Get a fund ID from search results
2. Update `fund_id` in environment
3. Use **Mutual Fund Orders → Place Order**
4. Modify the request body as needed
5. Send request

## 🔒 Security Notes

1. **Never commit** your `auth_token` to version control
2. Use **DEV environment** for testing
3. Be cautious with **PROD environment** - all transactions are real
4. Regularly refresh your auth tokens
5. Keep environment files secure

## 🐛 Troubleshooting

### 401 Unauthorized Error

- Your token might be expired
- Re-authenticate using Login endpoint
- Update `auth_token` in environment

### 404 Not Found

- Check if `base_url` is correct for your environment
- Verify the endpoint path in the documentation

### Missing Variables

- Ensure all required variables are set in your environment
- Check variable names match exactly (case-sensitive)

## 📊 Request/Response Examples

### Successful Response (200)

```json
{
  "status": "success",
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response (4xx/5xx)

```json
{
  "isError": true,
  "status": 400,
  "response": {
    "message": "Error description"
  }
}
```

## 🔄 Updates and Maintenance

- Collection Version: v2.1
- Last Updated: October 9, 2025
- Total Endpoints: 50+
- Supported Services: customerservice, mutualfundservice, planservice, adminservice

## 💡 Tips

1. **Use Collections Runner** to test multiple endpoints sequentially
2. **Add Tests** to automatically validate responses
3. **Create Pre-request Scripts** for dynamic data generation
4. **Use Mock Servers** for frontend development without hitting real APIs
5. **Share Collections** with your team via Postman Workspace

## 📞 Support

For API-related issues:

- Check the React codebase: `/src/http/restservice.js`
- Review store files: `/src/store/*.js`
- Contact backend team for API changes

## 🎯 Next Steps

1. ✅ Import collection and environments
2. ✅ Configure authentication
3. ✅ Test endpoints in DEV environment
4. ✅ Build your test suites
5. ✅ Document any new endpoints discovered

---

**Happy Testing! 🚀**
