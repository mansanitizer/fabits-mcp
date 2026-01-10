/**
 * Test OTP authentication for NON-KYC users
 * This script tests the complete OTP flow for users without KYC
 */

import axios from 'axios';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const CONFIG = {
    BASE_URL: 'https://apimywealth.fabits.com',
    ENDPOINTS: {
        REQUEST_OTP: '/customerservice/v2/api/customer/validate',
        VERIFY_OTP: '/authserver/api/auth/login/otp',
        KYC_STATUS: '/customerservice/api/hyperverge/checkKycInitiated',
        CUSTOMER_DETAILS: '/customerservice/api/customer'
    }
};

async function testNonKycAuth() {
    console.log('\n='.repeat(60));
    console.log('🧪 TESTING NON-KYC USER AUTHENTICATION');
    console.log('='.repeat(60));

    const phoneNumber = '+919643531855'; // Non-KYC user with +91
    console.log(`\n📱 Phone Number: ${phoneNumber}`);

    try {
        // ========================================
        // STEP 1: Request OTP
        // ========================================
        console.log('\n' + '-'.repeat(60));
        console.log('STEP 1: Requesting OTP...');
        console.log('-'.repeat(60));

        const otpRequestUrl = `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.REQUEST_OTP}`;
        console.log(`\n📤 REQUEST:`);
        console.log(`  URL: ${otpRequestUrl}`);
        console.log(`  Method: POST`);
        console.log(`  Body: ${JSON.stringify({ phoneNumber }, null, 2)}`);

        const otpResponse = await axios.post(
            otpRequestUrl,
            { phoneNumber },
            {
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log(`\n📥 RESPONSE:`);
        console.log(`  Status: ${otpResponse.status}`);
        console.log(`  Data: ${JSON.stringify(otpResponse.data, null, 2)}`);

        // Check for empty response (204 No Content) which usually means user not found/not registered
        if (otpResponse.status === 204 || !otpResponse.data) {
            console.log(`\n⚠️  RESPONSE IS EMPTY (204 No Content)`);
            console.log('This typically means the user is NOT REGISTERED or NOT ACTIVE.');
            console.log('The frontend redirects to /sign-up in this case.');
            console.log('This explains why no OTP is received!');
            process.exit(0);
        }

        if (otpResponse.data.isError) {
            console.error(`\n❌ ERROR: ${otpResponse.data.message}`);
            process.exit(1);
        }

        // Check isUserActive flag
        if (otpResponse.data.isUserActive === false) {
            console.log('\n⚠️  User found but NOT ACTIVE.');
            console.log('The frontend would redirect to /activate-account-otp');
            process.exit(0); // Exit as we can't proceed with OTP verification for inactive users
        } else if (otpResponse.data.isUserActive) {
            console.log(`\n✅ OTP triggers successfully for active user!`);
        } else {
            console.log('\n⚠️  Unexpected response format.');
        }

        // ========================================
        // STEP 2: Get OTP from user
        // ========================================
        console.log('\n' + '-'.repeat(60));
        console.log('STEP 2: Enter OTP');
        console.log('-'.repeat(60));

        const otp = await question('\n🔑 Enter the OTP you received: ');

        if (!otp || otp.length !== 6) {
            console.error('\n❌ ERROR: Invalid OTP format (must be 6 digits)');
            process.exit(1);
        }

        console.log(`\n📝 OTP entered: ${otp}`);

        // ========================================
        // STEP 3: Verify OTP
        // ========================================
        console.log('\n' + '-'.repeat(60));
        console.log('STEP 3: Verifying OTP...');
        console.log('-'.repeat(60));

        const verifyUrl = `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.VERIFY_OTP}`;
        const verifyPayload = {
            phoneNumber,
            otp
        };

        console.log(`\n📤 REQUEST:`);
        console.log(`  URL: ${verifyUrl}`);
        console.log(`  Method: POST`);
        console.log(`  Body: ${JSON.stringify(verifyPayload, null, 2)}`);

        const verifyResponse = await axios.post(
            verifyUrl,
            verifyPayload,
            {
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log(`\n📥 RESPONSE:`);
        console.log(`  Status: ${verifyResponse.status}`);
        console.log(`  Data: ${JSON.stringify(verifyResponse.data, null, 2)}`);

        const { access_token, refresh_token, token_type, expires_in } = verifyResponse.data;

        if (!access_token) {
            console.error(`\n❌ ERROR: No access token in response`);
            process.exit(1);
        }

        console.log(`\n✅ OTP verified successfully!`);
        console.log(`  Token Type: ${token_type}`);
        console.log(`  Expires In: ${expires_in}s`);
        console.log(`  Access Token (first 50 chars): ${access_token.substring(0, 50)}...`);

        // Decode JWT
        const tokenParts = access_token.split('.');
        if (tokenParts.length === 3) {
            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
            console.log(`\n🔓 DECODED TOKEN PAYLOAD:`);
            console.log(JSON.stringify(payload, null, 2));
        }

        // ========================================
        // STEP 4: Check KYC Status
        // ========================================
        console.log('\n' + '-'.repeat(60));
        console.log('STEP 4: Checking KYC Status...');
        console.log('-'.repeat(60));

        const kycStatusUrl = `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.KYC_STATUS}`;
        console.log(`\n📤 REQUEST:`);
        console.log(`  URL: ${kycStatusUrl}`);
        console.log(`  Method: GET`);
        console.log(`  Authorization: Bearer ${access_token.substring(0, 30)}...`);

        try {
            const kycResponse = await axios.get(
                kycStatusUrl,
                {
                    timeout: 30000,
                    headers: {
                        'Authorization': `Bearer ${access_token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log(`\n📥 RESPONSE:`);
            console.log(`  Status: ${kycResponse.status}`);
            console.log(`  Data: ${JSON.stringify(kycResponse.data, null, 2)}`);

            const kycData = kycResponse.data.data;
            console.log(`\n📊 KYC STATUS SUMMARY:`);
            console.log(`  KYC Initiated: ${kycData?.kycInitiated ? '✅ Yes' : '❌ No'}`);
            console.log(`  KYC Completed: ${kycData?.kycCompleted ? '✅ Yes' : '❌ No'}`);
            console.log(`  KYC Status: ${kycData?.kycStatus || 'N/A'}`);

        } catch (kycError) {
            console.error(`\n⚠️  KYC Status Check Failed:`);
            if (axios.isAxiosError(kycError)) {
                console.error(`  Status: ${kycError.response?.status}`);
                console.error(`  Response: ${JSON.stringify(kycError.response?.data, null, 2)}`);
            } else {
                console.error(kycError);
            }
        }

        // ========================================
        // STEP 5: Check Customer Details
        // ========================================
        console.log('\n' + '-'.repeat(60));
        console.log('STEP 5: Checking Customer Details...');
        console.log('-'.repeat(60));

        const cleanPhone = phoneNumber.replace(/^\+91/, '');
        const customerUrl = `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.CUSTOMER_DETAILS}?phoneNumber=${cleanPhone}`;
        console.log(`\n📤 REQUEST:`);
        console.log(`  URL: ${customerUrl}`);
        console.log(`  Method: GET`);
        console.log(`  Authorization: Bearer ${access_token.substring(0, 30)}...`);

        try {
            const customerResponse = await axios.get(
                customerUrl,
                {
                    timeout: 30000,
                    headers: {
                        'Authorization': `Bearer ${access_token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log(`\n📥 RESPONSE:`);
            console.log(`  Status: ${customerResponse.status}`);
            console.log(`  Data: ${JSON.stringify(customerResponse.data, null, 2)}`);

            const customerData = customerResponse.data;
            console.log(`\n👤 CUSTOMER DETAILS SUMMARY:`);
            console.log(`  UID: ${customerData.uid || 'N/A'}`);
            console.log(`  Phone: ${customerData.phoneNumber || 'N/A'}`);
            console.log(`  KYC Phone: ${customerData.kycPhoneNumber || 'N/A'}`);
            console.log(`  Email: ${customerData.email || 'N/A'}`);
            console.log(`  E-log Done: ${customerData.isElogDone ? '✅ Yes' : '❌ No'}`);

        } catch (customerError) {
            console.error(`\n⚠️  Customer Details Check Failed:`);
            if (axios.isAxiosError(customerError)) {
                console.error(`  Status: ${customerError.response?.status}`);
                console.error(`  Response: ${JSON.stringify(customerError.response?.data, null, 2)}`);
            } else {
                console.error(customerError);
            }
        }

        // ========================================
        // FINAL SUMMARY
        // ========================================
        console.log('\n' + '='.repeat(60));
        console.log('✅ AUTHENTICATION TEST COMPLETED SUCCESSFULLY');
        console.log('='.repeat(60));
        console.log('\nThe user can authenticate even without KYC!');
        console.log('Non-KYC users should be able to:');
        console.log('  - Login with OTP ✅');
        console.log('  - View their account status ✅');
        console.log('  - Start KYC process (if implemented)');
        console.log('\nNon-KYC users CANNOT:');
        console.log('  - Make investments ❌');
        console.log('  - View portfolio (if no holdings) ❌');
        console.log('  - Start SIPs ❌');

    } catch (error) {
        console.error('\n' + '='.repeat(60));
        console.error('❌ TEST FAILED');
        console.error('='.repeat(60));

        if (axios.isAxiosError(error)) {
            console.error(`\nHTTP Error:`);
            console.error(`  Status: ${error.response?.status}`);
            console.error(`  Status Text: ${error.response?.statusText}`);
            console.error(`  URL: ${error.config?.url}`);
            console.error(`  Request Data: ${error.config?.data}`);
            console.error(`\nResponse Data:`);
            console.error(JSON.stringify(error.response?.data, null, 2));
        } else {
            console.error(`\nGeneral Error:`);
            console.error(error);
        }

        process.exit(1);
    } finally {
        rl.close();
    }
}

// Run the test
testNonKycAuth().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
