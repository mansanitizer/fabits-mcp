# HyperVerge KYC Integration Plan for Fabits MCP

## 📋 Executive Summary

Integrate HyperVerge's video KYC solution into the Fabits MCP server to enable non-KYC users to complete their KYC process through a chat-based interface. This will allow users to transition from "not KYC compliant" to "KYC completed" status, enabling them to make investments.

---

## 🎯 Objectives

1. **Detect Non-KYC Users**: Identify when a user logs in without completed KYC
2. **Initiate KYC Flow**: Guide users through HyperVerge KYC process via chat
3. **Track KYC Status**: Monitor and update KYC completion status
4. **Enable BSE e-Log**: Automatically trigger BSE authentication after KYC approval
5. **Seamless Transition**: Once KYC is complete, allow users to invest normally

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User (WhatsApp/Chat)                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      MCP Server                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  1. Login Flow (auth.ts)                             │  │
│  │     - Detects KYC status via existing API            │  │
│  │     - Sets kycCompleted/kycInitiated flags           │  │
│  └───────────────────────────────────────────────────────┘  │
│                         │                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  2. New KYC Module (kyc.ts) - TO BE CREATED          │  │
│  │     - fabits_start_kyc()                             │  │
│  │     - fabits_check_kyc_status()                       │  │
│  │     - fabits_trigger_elog()                          │  │
│  └───────────────────────────────────────────────────────┘  │
│                         │                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  3. System Prompt Update (SYSTEM_PROMPT.md)          │  │
│  │     - Add KYC flow guidance                          │  │
│  │     - Define conversation steps for non-KYC users    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Fabits Backend APIs                        │
│  • POST /hyperverge/accessToken                             │
│  • GET  /hyperverge/checkKycInitiated                       │
│  • GET  /customer?phoneNumber={phone}                       │
│  • POST /bseStar/api/elogAuthentication                     │
│  • POST /customer/updateElogStatus                          │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              HyperVerge KYC Service                          │
│  (Video KYC via SDK - frontend/user end)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Implementation Components

### **Component 1: KYC Module (`src/kyc.ts`)** ✨ NEW FILE

#### Purpose
Handle all KYC-related operations including initiating KYC, checking status, and triggering e-Log authentication.

#### Functions to Implement

##### 1.1 `startKYC()`
**Description**: Initiate HyperVerge KYC process for the user

**Parameters**:
- `tokenManager: TokenManager` - User authentication
- `panNumber: string` - User's PAN card number
- `dateOfBirth: string` - Format: DD-MM-YYYY
- `email?: string` - Optional email (fallback to user's login email)

**Flow**:
1. Validate user is logged in
2. Validate PAN format (5 letters + 4 digits + 1 letter)
3. Validate DOB format (DD-MM-YYYY)
4. Call `POST /customerservice/api/hyperverge/accessToken` to get HyperVerge token
5. Return token + instructions for user to complete KYC

**Return**:
```typescript
{
  success: true,
  message: "KYC initiated successfully",
  data: {
    token: "hyperverge_token_here",
    workflowId: "yGguwb_21_05_25_15_23_04",
    transactionId: "uuid-generated",
    nextSteps: "Please visit the KYC portal link..."
  }
}
```

**Error Handling**:
- Invalid PAN format → User-friendly error
- Invalid DOB format → User-friendly error
- Token fetch failure → Retry suggestion

##### 1.2 `checkKYCStatus()`
**Description**: Check current KYC status for the user

**Parameters**:
- `tokenManager: TokenManager`

**Flow**:
1. Get user's phone number from token
2. Call `GET /customerservice/api/hyperverge/checkKycInitiated`
3. Call `GET /customerservice/api/customer?phoneNumber={phone}` to get kycPhoneNumber
4. Determine status: NOT_STARTED | IN_PROGRESS | NEEDS_REVIEW | COMPLETED

**Return**:
```typescript
{
  kycInitiated: boolean,
  kycCompleted: boolean,
  kycPhoneNumber: string | null,
  clientCode: string | null,
  status: "NOT_STARTED" | "IN_PROGRESS" | "NEEDS_REVIEW" | "COMPLETED"
}
```

##### 1.3 `triggerElog()`
**Description**: Initiate BSE e-Log authentication after KYC completion

**Parameters**:
- `tokenManager: TokenManager`

**Flow**:
1. Check if KYC is completed (must have kycPhoneNumber)
2. Get customer details to extract UCC (client code)
3. Call `POST /mutualfundservice/api/bseStar/api/elogAuthentication`
4. Return e-Log authentication URL

**Payload**:
```typescript
{
  clientCode: "ucc_code",
  loopbackUrl: "https://mywealth.fabits.com/dashboard/kyc-complete",
  allowLoopbackMsg: "Y"
}
```

**Return**:
```typescript
{
  success: true,
  authUrl: "https://bse-elog-url.com/...",
  message: "Please complete BSE authentication via the link"
}
```

**Error Handling**:
- Already authenticated → Inform user
- No kycPhoneNumber → Ask user to complete KYC first
- e-Log API error → Suggest retry

##### 1.4 `updateElogStatus()`
**Description**: Update user's e-Log completion status after BSE callback

**Parameters**:
- `tokenManager: TokenManager`
- `kycPhoneNumber: string`
- `isElogDone: boolean`

**Flow**:
1. Call `POST /customerservice/api/customer/updateElogStatus`
2. Update primary phone number if needed
3. Return confirmation

---

### **Component 2: Tool Definitions (`src/tool-defs.ts`)** 🔧 UPDATE

#### New Tools to Add

##### 2.1 `fabits_start_kyc`
```typescript
{
  name: "fabits_start_kyc",
  description: "Initiate KYC process for non-KYC users. Requires PAN number and date of birth.",
  inputSchema: {
    type: "object",
    properties: {
      pan_number: {
        type: "string",
        description: "PAN card number (format: ABCDE1234F - 5 letters + 4 digits + 1 letter)"
      },
      date_of_birth: {
        type: "string",
        description: "Date of birth in DD-MM-YYYY format"
      },
      email: {
        type: "string",
        description: "Email address (optional, uses logged-in user's email if not provided)"
      }
    },
    required: ["pan_number", "date_of_birth"]
  }
}
```

##### 2.2 `fabits_check_kyc_status`
```typescript
{
  name: "fabits_check_kyc_status",
  description: "Check the current KYC status for the logged-in user",
  inputSchema: {
    type: "object",
    properties: {}
  }
}
```

##### 2.3 `fabits_complete_elog_authentication`
```typescript
{
  name: "fabits_complete_elog_authentication",
  description: "Trigger BSE e-Log authentication after KYC is completed",
  inputSchema: {
    type: "object",
    properties: {}
  }
}
```

---

### **Component 3: Dispatcher (`src/dispatcher.ts`)** 🔧 UPDATE

#### Changes Required

1. **Import new KYC module**:
```typescript
import { startKYC, checkKYCStatus, triggerElog } from './kyc.js';
```

2. **Add new cases in `dispatchToolCall()`**:
```typescript
case 'fabits_start_kyc':
  return await startKYC(
    tokenManager,
    args.pan_number,
    args.date_of_birth,
    args.email
  );

case 'fabits_check_kyc_status':
  return await checkKYCStatus(tokenManager);

case 'fabits_complete_elog_authentication':
  return await triggerElog(tokenManager);
```

---

### **Component 4: Configuration (`src/config.ts`)** 🔧 UPDATE

#### API Endpoints to Add/Verify

```typescript
export const CONFIG = {
  ENDPOINTS: {
    // ... existing endpoints ...
    
    // KYC-related endpoints (already exist, verify they're correct)
    KYC_STATUS: '/customerservice/api/hyperverge/checkKycInitiated',
    KYC_STATUSES: '/customerservice/api/customer/fetchCustomerKycStatuses',
    HYPERVERGE_TOKEN: '/customerservice/api/hyperverge/accessToken', // NEW
    CUSTOMER_DETAILS: '/customerservice/api/customer', // NEW
    ELOG_AUTH: '/mutualfundservice/api/bseStar/api/elogAuthentication', // NEW
    UPDATE_ELOG_STATUS: '/customerservice/api/customer/updateElogStatus', // NEW
    UPDATE_PRIMARY_PHONE: '/customerservice/api/customer/updatePrimaryPhoneNumber', // NEW
  },
  
  HYPERVERGE: {
    WORKFLOW_ID: 'yGguwb_21_05_25_15_23_04', // Short flow
    // Alternative workflows:
    // 'HeHXEm_09_06_25_22_36_54' // Dynamic
    // '0EbWbt_03_04_25_17_43_33'
    // 'fZlgIt_21_05_25_18_34_30'
    // 'VyE9BW_30_04_25_14_29_28' // Non-validated
  }
};
```

---

### **Component 5: System Prompt (`SYSTEM_PROMPT.md`)** 📝 UPDATE

#### New Sections to Add

##### 5.1 **After STEP 4 (Auto-Fetch Portfolio)** - Add KYC Detection Logic

```markdown
### STEP 4.5: KYC Status Detection (Automatic)
**Trigger**: Portfolio fetch returns KYC status
**Goal**: Guide non-KYC users to complete KYC

**When KYC is NOT Completed**:

If the status shows:
- `❌ KYC Not Started` OR
- `⏳ KYC In Progress`

**Your Response**:
> "I notice your KYC isn't complete yet. To start investing, you'll need to complete a quick video KYC process (takes about 5-10 minutes).
>
> I can help you get started right away! I'll just need:
> - Your PAN card number
> - Your date of birth
>
> Would you like to start your KYC now?"

**Wait for user confirmation.**

---

### STEP 5: KYC Completion Flow (for Non-KYC Users)

#### STEP 5.1: Collect KYC Details
**Trigger**: User agrees to start KYC
**Goal**: Collect PAN and DOB

**Your Action**:
Ask for details one by one:

1. First ask for PAN:
> "Great! Let's get started. Please share your **PAN card number** (format: ABCDE1234F)"

2. Wait for PAN, validate format

3. Then ask for DOB:
> "Thank you! Now please share your **date of birth** in DD-MM-YYYY format (e.g., 15-08-1990)"

4. Wait for DOB

---

#### STEP 5.2: Initiate KYC Process
**Trigger**: User provided valid PAN and DOB
**Goal**: Start HyperVerge KYC

**Your Action**:
1. Call: `fabits_start_kyc(pan_number=PAN, date_of_birth=DOB)`
2. **STOP. Wait for tool output.**

**On Tool Success** (next turn):
> "✅ **KYC Process Initiated!**
>
> I've started your KYC process. Since this is a chat interface, you'll need to complete the video KYC on HyperVerge's platform.
>
> **Next Steps**:
> 1. Visit the Fabits web app or mobile app
> 2. Go to Settings → Complete KYC
> 3. Complete the video KYC process (takes 5-10 minutes)
> 4. Once done, come back here and type 'check kyc status'
>
> Or, if you have access to a browser, I can guide you to the KYC portal directly.
>
> Would you like me to check back later, or shall I send you a reminder?"

**On Tool Failure**:
> "I encountered an issue starting your KYC. [Error message]. Please try again or contact support."

---

#### STEP 5.3: Check KYC Status (User Returns)
**Trigger**: User asks "check kyc status" or "is my kyc done"
**Goal**: Update KYC status

**Your Action**:
1. Call: `fabits_check_kyc_status()`
2. **STOP. Wait for tool output.**

**On Tool Success - KYC Completed** (next turn):
> "🎉 **Great news! Your KYC is complete!**
>
> Now I need to set up your BSE (Bombay Stock Exchange) authentication. This is a one-time step.
>
> I'll generate a secure authentication link for you. Should I proceed?"

**User confirms** → Proceed to STEP 5.4

**On Tool Success - KYC In Progress**:
> "Your KYC is still being reviewed. This usually takes 24-48 hours. I'll notify you once it's approved!"

**On Tool Success - KYC Not Started**:
> "It looks like you haven't started the KYC process yet. Would you like me to help you start now?"

---

#### STEP 5.4: BSE e-Log Authentication
**Trigger**: KYC completed, user confirms e-Log setup
**Goal**: Complete BSE authentication

**Your Action**:
1. Call: `fabits_complete_elog_authentication()`
2. **STOP. Wait for tool output.**

**On Tool Success** (next turn):
> "✅ **BSE Authentication Link Generated!**
>
> Please visit this link to complete your BSE authentication:
> [Authentication URL]
>
> **What to expect**:
> - You'll be redirected to BSE's secure portal
> - Complete the authentication (takes 2-3 minutes)
> - You'll be redirected back to Fabits
>
> Once done, you'll be all set to start investing! 🚀"

**On Tool Failure - Already Authenticated**:
> "✅ Your BSE authentication is already complete! You're all set to invest.
>
> What would you like to do? I can help you:
> - Search for funds
> - Start a SIP
> - Make a lumpsum investment"

---

#### STEP 5.5: Post-KYC Flow
**Trigger**: User completes e-Log and returns
**Goal**: Enable full investment capabilities

**Your Action**:
1. Auto-check status (call `fabits_status`)
2. Welcome user to full platform

**Your Response**:
> "🎊 **Welcome to Fabits!**
>
> Your account is now fully set up and ready for investments!
>
> Here's what you can do:
> - 💰 Check your portfolio
> - 🔍 Search for top-performing funds
> - 📈 Start a SIP (Systematic Investment Plan)
> - 💸 Make one-time investments
>
> What would you like to explore first?"

---
```

##### 5.2 **Update Tool Reference Section**

Add to the KYC section:

```markdown
### KYC Management
| Tool | When to Use | Required Args |
|------|-------------|---------------|
| `fabits_start_kyc` | User wants to start KYC process | `pan_number`, `date_of_birth`, `email` (optional) |
| `fabits_check_kyc_status` | User asks about KYC status | — |
| `fabits_complete_elog_authentication` | After KYC is completed, initiate BSE e-Log | — |
```

##### 5.3 **Update Edge Cases Section**

```markdown
### User asks to invest without KYC
> "I'd love to help you invest, but you need to complete your KYC first (it's a regulatory requirement). The good news is it only takes about 10 minutes! Would you like me to help you get started?"

### User asks "What is KYC?"
> "KYC stands for 'Know Your Customer' - it's a one-time identity verification process required by Indian regulations for financial investments. It's completely secure and helps protect your account. I can guide you through it in just a few minutes!"

### User completed KYC but e-Log is pending
> "Your KYC is approved! 🎉 There's just one more quick step - BSE authentication - which takes 2 minutes. Would you like to complete it now?"
```

---

### **Component 6: Type Definitions (`src/types.ts`)** 🔧 UPDATE

#### New Types to Add

```typescript
// ===== KYC Types =====

export interface KYCInitiateRequest {
  panNumber: string;
  dateOfBirth: string;
  phoneNumber: string;
  email?: string;
}

export interface HyperVergeTokenResponse {
  token: string;
  expiresAt?: string;
}

export interface KYCStatusDetailed {
  kycInitiated: boolean;
  kycCompleted: boolean;
  kycPhoneNumber: string | null;
  clientCode: string | null;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'NEEDS_REVIEW' | 'COMPLETED';
  uid?: string;
}

export interface ElogAuthRequest {
  clientCode: string;
  loopbackUrl: string;
  allowLoopbackMsg: string;
}

export interface ElogAuthResponse {
  isError: boolean;
  status: string;
  data?: {
    authurl: string;
    errordesc: string;
  };
  response?: {
    data?: {
      errordesc: string;
    };
  };
}

export interface UpdateElogStatusRequest {
  kycPhoneNumber: string;
  isElogDone: boolean;
}
```

---

## 🔄 User Journey Flow

### **Scenario 1: New User (No KYC)**

```
1. User: "Hi"
   Agent: "Welcome! Please share your registered mobile number"

2. User: "9876543210"
   Agent: [Sends OTP] "I've sent a code to your number"

3. User: "123456"
   Agent: [Verifies OTP] [Auto-fetches portfolio]
          "You're logged in! But I notice your KYC isn't complete.
           To invest, you'll need to complete KYC. Would you like to start?"

4. User: "Yes"
   Agent: "Great! Please share your PAN card number"

5. User: "ABCDE1234F"
   Agent: "Thank you! Now your date of birth (DD-MM-YYYY)"

6. User: "15-08-1990"
   Agent: [Calls fabits_start_kyc]
          "KYC initiated! Please complete video KYC via the app.
           Type 'check kyc' when done."

7. [User completes KYC via app/web]

8. User: "check kyc"
   Agent: [Calls fabits_check_kyc_status]
          "🎉 KYC complete! Now let's set up BSE authentication.
           Should I proceed?"

9. User: "Yes"
   Agent: [Calls fabits_complete_elog_authentication]
          "Here's your BSE auth link: [URL]
           Complete it and you're ready to invest!"

10. [User completes e-Log]

11. User: "Done"
    Agent: [Checks status] "🎊 All set! What would you like to invest in?"
```

### **Scenario 2: KYC In Progress**

```
1. User logs in
   Agent: [Detects KYC in progress]
          "Welcome back! Your KYC is being reviewed (24-48 hrs).
           I'll notify you when it's approved!"
```

### **Scenario 3: KYC Complete, e-Log Pending**

```
1. User logs in
   Agent: [Detects KYC complete, no client code]
          "Your KYC is approved! One last step - BSE authentication.
           Should I generate the link?"
```

---

## 🛡️ Security & Validation

### Input Validation

1. **PAN Number**:
   - Format: Exactly 10 characters
   - Pattern: `^[A-Z]{5}[0-9]{4}[A-Z]{1}$`
   - Example: `ABCDE1234F`

2. **Date of Birth**:
   - Format: `DD-MM-YYYY`
   - Pattern: `^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-\d{4}$`
   - Example: `15-08-1990`
   - Validate age: Must be 18+ years old

3. **Phone Number**:
   - Already validated in auth flow
   - Use from authenticated session

### API Security

- ✅ All KYC APIs require Bearer token authentication
- ✅ Use existing `createAuthenticatedClient()` from `auth.ts`
- ✅ Never expose HyperVerge tokens to user
- ✅ Never log sensitive PAN/DOB data

### Error Handling

1. **Network Errors**: Retry with exponential backoff
2. **Validation Errors**: Clear user-friendly messages
3. **API Errors**: Translate backend errors to user language
4. **Timeout**: Set 30s timeout for HyperVerge token API

---

## 📊 Testing Strategy

### Unit Tests

1. **PAN Validation**:
   - Valid PANs: `ABCDE1234F`, `ZZZZZ9999Z`
   - Invalid: `ABC123`, `12345ABCDE`, `abcde1234f`

2. **DOB Validation**:
   - Valid: `01-01-1990`, `31-12-2000`
   - Invalid: `32-01-1990`, `1-1-90`, `2005-08-15`

3. **KYC Status Mapping**:
   - Test all status combinations
   - Verify correct flow suggestions

### Integration Tests

Create test scripts in `scripts/`:

1. `scripts/test-kyc-start.ts` - Test KYC initiation
2. `scripts/test-kyc-status.ts` - Test status checking
3. `scripts/test-elog.ts` - Test e-Log flow

### Manual Testing Checklist

- [ ] New user login → KYC prompt appears
- [ ] Invalid PAN → Error message
- [ ] Invalid DOB → Error message
- [ ] Valid inputs → KYC initiated successfully
- [ ] Status check → Correct status returned
- [ ] KYC complete → e-Log triggered
- [ ] Already completed → Appropriate message

---

## 📅 Implementation Timeline

### **Phase 1: Core KYC Module** (Day 1-2)
- [ ] Create `src/kyc.ts` with all functions
- [ ] Add new types to `src/types.ts`
- [ ] Update `src/config.ts` with endpoints
- [ ] Write validation utilities

### **Phase 2: Tool Integration** (Day 2-3)
- [ ] Add tool definitions to `src/tool-defs.ts`
- [ ] Update `src/dispatcher.ts` with new cases
- [ ] Test tool calls via MCP inspector

### **Phase 3: System Prompt** (Day 3)
- [ ] Update `SYSTEM_PROMPT.md` with KYC flows
- [ ] Add conversation examples
- [ ] Update edge cases

### **Phase 4: Testing** (Day 4)
- [ ] Unit tests for validation
- [ ] Integration tests for API calls
- [ ] Manual testing with test accounts
- [ ] Fix bugs and edge cases

### **Phase 5: Documentation** (Day 5)
- [ ] Update README with KYC flow
- [ ] Create user guide
- [ ] Document API responses
- [ ] Final review and deployment

---

## 🚨 Known Limitations & Considerations

### 1. **Video KYC Cannot Be Done in Chat**
- HyperVerge requires camera access and web SDK
- Users must complete video KYC via web/mobile app
- MCP can only initiate and track status

**Solution**: Provide clear instructions to open web app

### 2. **e-Log Requires Browser**
- BSE authentication redirects to external portal
- Cannot be completed in WhatsApp/chat

**Solution**: Send authentication URL for user to open

### 3. **KYC Status Polling**
- Real-time status updates not available
- Need manual status checks by user

**Solution**: Educate user to check back after completing steps

### 4. **Workflow ID Management**
- HyperVerge workflow IDs may change over time
- Currently hardcoded in config

**Solution**: Make configurable via environment variable

### 5. **Email Handling**
- Some users may have `@fabits.com` placeholder emails
- HyperVerge doesn't accept these

**Solution**: Send 'null' or ask user for real email

---

## 🔧 Environment Variables

Add to `.env`:

```bash
# HyperVerge Configuration
HYPERVERGE_WORKFLOW_ID=yGguwb_21_05_25_15_23_04
HYPERVERGE_TOKEN_EXPIRY=3600

# BSE e-Log Configuration
BSE_ELOG_LOOPBACK_URL=https://mywealth.fabits.com/dashboard/kyc-complete
```

---

## 📖 API Documentation

### **1. HyperVerge Access Token**

**Endpoint**: `POST /customerservice/api/hyperverge/accessToken`

**Request**:
```json
{} // Empty body
```

**Response**:
```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### **2. Check KYC Initiated**

**Endpoint**: `GET /customerservice/api/hyperverge/checkKycInitiated`

**Response**:
```json
{
  "status": "success",
  "data": {
    "kycInitiated": true,
    "kycCompleted": false,
    "kycStatus": "IN_PROGRESS"
  }
}
```

### **3. Get Customer Details**

**Endpoint**: `GET /customerservice/api/customer?phoneNumber={phone}`

**Response**:
```json
{
  "status": "success",
  "data": {
    "uid": "BSE001-123456",
    "phoneNumber": "9876543210",
    "kycPhoneNumber": "9876543210",
    "email": "user@example.com",
    "isElogDone": true
  }
}
```

### **4. e-Log Authentication**

**Endpoint**: `POST /mutualfundservice/api/bseStar/api/elogAuthentication`

**Request**:
```json
{
  "clientCode": "bse001",
  "loopbackUrl": "https://mywealth.fabits.com/dashboard/kyc-complete",
  "allowLoopbackMsg": "Y"
}
```

**Response**:
```json
{
  "isError": false,
  "status": "SUCCESS",
  "data": {
    "authurl": "https://bsestarmf.in/...",
    "errordesc": "ELOG Link Generated Successfully"
  }
}
```

**Error Response** (Already Done):
```json
{
  "isError": true,
  "response": {
    "data": {
      "errordesc": "FAILED: AUTHENTICATION IS ALREADY DONE"
    }
  }
}
```

### **5. Update e-Log Status**

**Endpoint**: `POST /customerservice/api/customer/updateElogStatus`

**Request**:
```json
{
  "kycPhoneNumber": "9876543210",
  "isElogDone": true
}
```

**Response**:
```json
{
  "isError": false,
  "status": "success",
  "message": "E-log status updated successfully"
}
```

---

## ✅ Success Criteria

1. **Functional**:
   - [ ] Non-KYC users can initiate KYC via chat
   - [ ] Users receive clear instructions for video KYC
   - [ ] KYC status can be checked and tracked
   - [ ] e-Log authentication can be triggered
   - [ ] Post-KYC users can invest normally

2. **User Experience**:
   - [ ] Clear, friendly language in all messages
   - [ ] No technical jargon exposed to users
   - [ ] Helpful error messages with next steps
   - [ ] Smooth transition from non-KYC to KYC-complete

3. **Security**:
   - [ ] All inputs validated
   - [ ] Sensitive data not logged
   - [ ] Proper authentication required for all operations
   - [ ] Secure token handling

4. **Reliability**:
   - [ ] Graceful error handling
   - [ ] Retry mechanisms for transient failures
   - [ ] No crashes or undefined behaviors

---

## 🎓 Developer Notes

### Key Insights from Reference Code

1. **HyperVerge SDK is Client-Side**:
   - The reference frontend uses HyperVerge's JavaScript SDK
   - Backend only provides access tokens
   - Actual video KYC happens in user's browser

2. **Workflow IDs Are Critical**:
   - Different workflow IDs provide different KYC flows
   - `yGguwb_21_05_25_15_23_04` is the "short flow"
   - Test with production-approved workflow ID

3. **e-Log is Multi-Step**:
   - Requires KYC completion first
   - Extracts UCC from uid (format: `BSE001-123456`)
   - Returns authentication URL for user to visit

4. **Status Callbacks**:
   - HyperVerge provides callbacks: `auto_approved`, `needs_review`, `auto_declined`, `user_cancelled`, `error`
   - Backend polling required to detect completion

5. **Phone Number Handling**:
   - KYC phone may differ from login phone
   - Need to reconcile and update if needed
   - Check with `cleanIndianPhoneNumber()` utility

### Suggested Utilities

Create `src/utils/validators.ts`:

```typescript
export function validatePAN(pan: string): boolean {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(pan);
}

export function validateDOB(dob: string): { valid: boolean; age?: number } {
  const dobRegex = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-\d{4}$/;
  if (!dobRegex.test(dob)) {
    return { valid: false };
  }
  
  const [day, month, year] = dob.split('-').map(Number);
  const birthDate = new Date(year, month - 1, day);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  
  return {
    valid: age >= 18,
    age
  };
}

export function formatIndianPhoneNumber(phone: string): string {
  // Remove +91 prefix if exists
  let cleaned = phone.replace(/^\+91/, '').replace(/\s/g, '');
  
  // Add +91 prefix with space
  return `+91 ${cleaned}`;
}

export function extractUCCFromUID(uid: string): string | null {
  // Format: "BSE001-123456" -> "BSE001"
  if (uid && uid.includes('-')) {
    return uid.split('-')[0].toLowerCase();
  }
  return null;
}
```

---

## 🔗 References

1. **HyperVerge Documentation**: Check for latest SDK and API docs
2. **BSE Star MF API**: Refer to BSE documentation for e-Log
3. **Reference Code**: `/Users/apple/fabits-mcp/_reference/frontend/src/Pages/KycLanding.jsx`
4. **Existing Auth Flow**: `/Users/apple/fabits-mcp/src/auth.ts`

---

## 📝 Next Steps

1. **Review this plan** with the team
2. **Confirm API endpoints** are correct with backend team
3. **Get HyperVerge credentials** and workflow IDs for production
4. **Decide on loopback URLs** for e-Log authentication
5. **Start implementation** following the timeline above

---

*Last Updated: 2026-01-10*  
*Created by: Antigravity AI Assistant*  
*Status: Planning Phase*
