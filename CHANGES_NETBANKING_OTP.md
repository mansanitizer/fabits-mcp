# Netbanking OTP Authentication Enhancement

## Date: 2026-01-10

### Summary
Added OTP authentication requirement to the netbanking payment flow, matching the UPI flow for consistency and security.

---

## Changes Made

### 1. **Tool Definition Update** (`src/tool-defs.ts`)
- Added `email` parameter (required)
- Updated description to mention OTP verification requirement

**Before:**
```typescript
required: ['user_id', 'scheme_code', 'amount', 'phone_number']
```

**After:**
```typescript
required: ['user_id', 'scheme_code', 'amount', 'phone_number', 'email']
```

---

### 2. **Function Implementation** (`src/invest.ts`)

#### Enhanced `completeLumpsumNetbanking()`:
- Added `email` parameter
- Added **Step 0**: Send transactional OTP before order placement
-Logic matches UPI flow pattern

#### Flow:
```
1. User calls fabits_complete_lumpsum_netbanking
   ↓
2. System sends OTP to phone & email
   ↓
3. Returns: "OTP sent, please verify"
   ↓
4. User verifies OTP with fabits_verify_transactional_otp
   ↓
5. User calls fabits_complete_lumpsum_netbanking again
   ↓
6. System detects OTP already verified
   ↓
7. Proceeds with order placement & payment link
```

---

### 3. **Dispatcher Update** (`src/dispatcher.ts`)
- Added `args.email` parameter to function call

---

## Behavior

### **First Call** (OTP Not Verified):
```
📱 OTP Required for Netbanking Payment

Amount: ₹X,XXX
Payment Method: Netbanking

An OTP has been sent to:
  Phone: +91XXXXXXXXXX
  Email: user@example.com

⚠️  NEXT STEPS:
1. Check your phone/email for the OTP
2. Use fabits_verify_transactional_otp to verify
3. After verification, call fabits_complete_lumpsum_netbanking again

Note: OTP is valid for 5 minutes
```

### **Second Call** (After OTP Verified):
```
✅ Step 1/2: Order Placed

Order Number: XXXXXX
Amount: ₹X,XXX

💳 Netbanking Payment Initiated

To complete the payment, you must be redirected to your bank's portal.
...
[Payment link]
...
```

---

## Comparison: UPI vs Netbanking (Now Aligned)

| Step | UPI Flow | Netbanking Flow (Enhanced) |
|------|----------|----------------------------|
| 1 | Send OTP | ✅ Send OTP |
| 2 | Verify OTP | ✅ Verify OTP |
| 3 | Place order | ✅ Place order |
| 4 | UPI payment link | ✅ Netbanking payment link |

---

## Security Benefits

1. **Two-Factor Authentication**: Both phone and email receive OTP
2. **Consistent User Experience**: Same flow as UPI
3. **Prevents Unauthorized Transactions**: OTP required before order placement
4. **Audit Trail**: OTP verification logged

---

## Files Modified

| File | Changes |
|------|---------|
| `src/tool-defs.ts` | Added email param, updated description |
| `src/invest.ts` | Added OTP sending step to netbanking function |
| `src/dispatcher.ts` | Added email parameter to dispatcher call |

---

## Testing

### Manual Test Flow:
```bash
# 1. Call netbanking (first time)
tool: fabits_complete_lumpsum_netbanking
params: {
  scheme_code: "XXX",
  amount: 1000,
  phone_number: "+91XXXXXXXXXX",
  email: "user@example.com"
}
# Output: OTP sent message

# 2. Verify OTP
tool: fabits_verify_transactional_otp
params: {
  phone_number: "+91XXXXXXXXXX",
  otp: "123456"
}
# Output: OTP verified

# 3. Call netbanking again (after verification)
tool: fabits_complete_lumpsum_netbanking
params: {same as above}
# Output: Payment link with order number
```

---

## Backward Compatibility

⚠️ **Breaking Change**: This adds a required `email` parameter.

**Impact**:
- Existing calls without `email` will fail
- Users will see clear error: `missing required parameter: email`
- Solution: Add email to all netbanking calls

---

## Benefits

✅ **Security**: OTP authentication prevents unauthorized payments  
✅ **Consistency**: Same flow as UPI for better UX  
✅ **Audit**: Clear log of OTP verification before order  
✅ **Flexibility**: Can verify OTP separately before payment  

---

## Next Steps

1. ✅ Build successful
2. 🔄 Deploy to main
3. 📝 Update system prompt to reflect new OTP requirement
4. 🧪 Test end-to-end with real netbanking payment

---

## Ready to Deploy ✅

Code changes complete and built successfully!
