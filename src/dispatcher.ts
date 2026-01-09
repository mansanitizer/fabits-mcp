
import { TokenManager, requestOTP, verifyOTP, getAuthStatus, refreshAccessToken, logout } from './auth.js';
import { searchFunds, getFundDetails, getStarFunds } from './funds.js';
import { investLumpsum, startSIP, redeemFund, investBasket, getAllBaskets, sendTransactionalOTP, verifyTransactionalOTP, investLumpsumUPI, completeLumpsumUPI, completeLumpsumNetbanking, checkPaymentStatus, setupBasketMandate, investBasketSIP, investBasketOneTime, registerMandate, checkMandateStatus, findUserMandates } from './invest.js';
import { getPortfolio, getSIPs, getTransactions, cancelSIP, getBasketHoldings, getActionPlans } from './portfolio.js';
import { testInvestwellTransactions } from './investwell.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';


export async function dispatchToolCall(name: string, args: any, tokenManager: TokenManager) {
    switch (name) {
        // Authentication
        case 'fabits_request_otp': {
            const result = await requestOTP(
                args.phone_number as string
            );
            return { content: [{ type: 'text', text: result }] };
        }

        case 'fabits_verify_otp': {
            const result = await verifyOTP(
                args.phone_number as string,
                args.otp as string,
                tokenManager
            );
            return { content: [{ type: 'text', text: result }] };
        }

        case 'fabits_status': {
            const result = await getAuthStatus(tokenManager);
            return { content: [{ type: 'text', text: result }] };
        }

        case 'fabits_refresh_token': {
            const result = await refreshAccessToken(tokenManager);
            return { content: [{ type: 'text', text: result }] };
        }

        case 'fabits_logout': {
            const result = await logout(tokenManager);
            return { content: [{ type: 'text', text: result }] };
        }

        // Fund Discovery
        case 'fabits_search_funds': {
            const result = await searchFunds(
                tokenManager,
                args.query as string,
                args.limit as number | undefined
            );
            return { content: [{ type: 'text', text: result }] };
        }

        case 'fabits_get_fund_details': {
            const result = await getFundDetails(
                tokenManager,
                args.fund_id as string
            );
            return { content: [{ type: 'text', text: result }] };
        }

        case 'fabits_get_star_funds': {
            const result = await getStarFunds(tokenManager);
            return { content: [{ type: 'text', text: result }] };
        }

        // Investment
        case 'fabits_invest_lumpsum': {
            const result = await investLumpsum(
                tokenManager,
                args.fund_id as string,
                args.amount as number
            );
            return { content: [{ type: 'text', text: result }] };
        }

        case 'fabits_start_sip': {
            // Uses sipRegistrationOrder with mandate
            const result = await startSIP(
                tokenManager,
                args.scheme_code as string,
                args.monthly_amount as number,
                args.sip_date as number,
                args.mandate_id as string
            );
            return { content: [{ type: 'text', text: result }] };
        }

        case 'fabits_redeem': {
            const result = await redeemFund(
                tokenManager,
                args.fund_id as string,
                args.units as number | undefined,
                args.amount as number | undefined,
                (args.redemption_type as 'PARTIAL' | 'FULL') || 'PARTIAL'
            );
            return { content: [{ type: 'text', text: result }] };
        }

        case 'fabits_get_baskets': {
            const result = await getAllBaskets(tokenManager);
            return { content: [{ type: 'text', text: result }] };
        }

        case 'fabits_invest_basket': {
            const result = await investBasket(
                tokenManager,
                args.basket_id as string,
                args.amount as number
            );
            return { content: [{ type: 'text', text: result }] };
        }

        case 'fabits_send_transactional_otp': {
            const result = await sendTransactionalOTP(
                tokenManager,
                args.phone_number as string,
                args.email as string
            );
            return { content: [{ type: 'text', text: result }] };
        }

        case 'fabits_verify_transactional_otp': {
            const result = await verifyTransactionalOTP(
                tokenManager,
                args.phone_number as string,
                args.otp as string
            );
            return { content: [{ type: 'text', text: result }] };
        }

        case 'fabits_invest_lumpsum_upi': {
            const result = await investLumpsumUPI(
                tokenManager,
                args.scheme_code as string,
                args.amount as number,
                args.upi_id as string,
                args.phone_number as string,
                args.email as string
            );
            return { content: [{ type: 'text', text: result }] };
        }

        case 'fabits_complete_lumpsum_upi': {
            const result = await completeLumpsumUPI(
                tokenManager,
                args.scheme_code as string,
                args.amount as number,
                args.upi_id as string,
                args.phone_number as string
            );
            return { content: [{ type: 'text', text: result }] };
        }

        case 'fabits_complete_lumpsum_netbanking': {
            const result = await completeLumpsumNetbanking(
                tokenManager,
                args.scheme_code as string,
                args.amount as number,
                args.phone_number as string
            );
            return { content: [{ type: 'text', text: result }] };
        }

        case 'fabits_check_payment_status': {
            const result = await checkPaymentStatus(
                tokenManager,
                args.order_number as string
            );
            return { content: [{ type: 'text', text: result }] };
        }

        case 'fabits_setup_basket_mandate': {
            // Hardcoded: account_type='SB', mandate_type='UNIVERSAL' (matching frontend)
            const result = await setupBasketMandate(
                tokenManager,
                args.plan_id as number,
                args.phone_number as string,
                args.email as string,
                args.amount as number | undefined,
                args.bank_account_number as string | undefined,
                args.ifsc_code as string | undefined,
                'SB', // Always Savings Bank
                'UNIVERSAL' // Always UNIVERSAL mandate (matching frontend)
            );
            return { content: [{ type: 'text', text: result }] };
        }

        case 'fabits_invest_basket_sip': {
            const result = await investBasketSIP(
                tokenManager,
                args.plan_id as number,
                args.sip_amount as number,
                args.sip_date as number,
                args.mandate_id as string,
                args.phone_number as string
            );
            return { content: [{ type: 'text', text: result }] };
        }

        case 'fabits_invest_basket_onetime': {
            const result = await investBasketOneTime(
                tokenManager,
                args.plan_id as number,
                args.amount as number,
                args.upi_id as string,
                args.phone_number as string
            );
            return { content: [{ type: 'text', text: result }] };
        }

        // Portfolio
        case 'fabits_get_portfolio': {
            const result = await getPortfolio(tokenManager);
            return { content: [{ type: 'text', text: result }] };
        }

        case 'fabits_get_sips': {
            const result = await getSIPs(tokenManager);
            return { content: [{ type: 'text', text: result }] };
        }

        case 'fabits_get_transactions': {
            const result = await getTransactions(
                tokenManager,
                args.limit as number | undefined
            );
            return { content: [{ type: 'text', text: result }] };
        }

        case 'fabits_cancel_sip': {
            const result = await cancelSIP(
                tokenManager,
                args.sip_registration_number as string
            );
            return { content: [{ type: 'text', text: result }] };
        }

        case 'fabits_get_basket_holdings': {
            const result = await getBasketHoldings(tokenManager);
            return { content: [{ type: 'text', text: result }] };
        }

        case 'fabits_get_action_plans': {
            const result = await getActionPlans(tokenManager);
            return { content: [{ type: 'text', text: result }] };
        }

        // Investwell Integration
        case 'investwell_test_transactions': {
            const result = await testInvestwellTransactions(
                tokenManager,
                args.year as number | undefined
            );
            return { content: [{ type: 'text', text: result }] };
        }

        // Standalone Mandate Tools
        case 'fabits_register_mandate': {
            const result = await registerMandate(
                tokenManager,
                args.amount as number
            );
            return { content: [{ type: 'text', text: result }] };
        }

        case 'fabits_check_mandate_status': {
            const result = await checkMandateStatus(
                tokenManager,
                args.mandate_id as string
            );
            return { content: [{ type: 'text', text: result }] };
        }

        case 'fabits_find_user_mandates': {
            const result = await findUserMandates(
                tokenManager,
                (args.status_filter as 'APPROVED' | 'ALL') || 'APPROVED'
            );
            return { content: [{ type: 'text', text: result }] };
        }

        default:
            throw new McpError(
                ErrorCode.MethodNotFound,
                `Unknown tool: ${name}`
            );
    }
}
