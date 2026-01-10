
import { requestOTP, signUp, activateAccount, getAuthStatus, TokenManager } from '../build/auth.js';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const PHONE = '+919643531855';
const TEST_USER = {
    firstName: 'Test',
    lastName: 'User',
    email: 'testuser@fabits.com',
    phoneNumber: PHONE
};

async function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function testFullFlow() {
    console.log('\n🚀 Starting FULL Sign Up & Auth Flow Test\n');
    console.log('--------------------------------------------------');

    const tokenManager = new TokenManager();

    // Step 1: Try Request OTP (Expect Failure)
    console.log(`\n🔹 STEP 1: Attempting Login (requestOTP) for ${PHONE}...`);
    try {
        await requestOTP(PHONE);
        console.log('❌ Unexpected: requestOTP succeeded. User is already registered?');
        // If success, we can't test Sign Up.
        rl.close();
        return;
    } catch (error) {
        if (error.message === 'USER_NOT_REGISTERED') {
            console.log('✅ Success: Caught "USER_NOT_REGISTERED". System correctly identified new user.');
        } else {
            console.log('❌ Error: Caught unexpected error:', error.message);
            rl.close();
            return;
        }
    }

    // Step 2: Sign Up
    console.log('\n🔹 STEP 2: Proceeding to Sign Up...');
    const doSignUp = await askQuestion(`❓ Do you want to create an account for ${PHONE}? (y/n) `);
    if (doSignUp.toLowerCase() !== 'y') {
        console.log('Aborted.');
        rl.close();
        return;
    }

    try {
        console.log(`Calling signUp(${TEST_USER.firstName}, ${TEST_USER.lastName}, ${TEST_USER.email}, ${PHONE})...`);
        const signUpResult = await signUp(TEST_USER.firstName, TEST_USER.lastName, TEST_USER.email, PHONE);
        console.log('\n✅ Sign Up API Response:', signUpResult);
    } catch (error) {
        if (error.message.includes('User already registered') || error.message.includes('Partner User')) {
            console.log('⚠️  Sign Up Info:', error.message);
            // Proceed to activation?
        } else {
            console.log('❌ Sign Up Failed:', error.message);
            rl.close();
            return;
        }
    }

    // Step 3: Activation (OTP)
    console.log('\n🔹 STEP 3: Activation / Login');
    console.log(`Please check ${PHONE} for an OTP.`);
    const otp = await askQuestion('❓ Enter the OTP received: ');

    try {
        console.log(`\nCalling activateAccount(${PHONE}, ${otp})...`);

        // Try Activate vs Verify. 
        // If User was already registered (but inactive?), verifyOTP might work.
        // But for NEW SignUp, activateAccount is the path.

        const activationResult = await activateAccount(PHONE, otp, tokenManager);
        console.log('\n✅ Activation Successful!');
        console.log(activationResult);

    } catch (error) {
        console.log('❌ Activation Failed:', error.message);
        console.log('Trying standard verifyOTP as fallback...');
        // Fallback?
    }

    // Step 4: Check Status
    console.log('\n🔹 STEP 4: Checking Token Status...');
    const status = await getAuthStatus(tokenManager);
    console.log(status);

    console.log('\n--------------------------------------------------');
    console.log('🎉 Test Complete.');
    rl.close();
}

testFullFlow();
