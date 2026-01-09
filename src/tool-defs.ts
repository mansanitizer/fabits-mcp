
import { Tool } from '@modelcontextprotocol/sdk/types.js';

const USER_ID_PROP = {
    user_id: {
        type: 'string',
        description: 'Unique identifier for the user (e.g., WhatsApp phone number). REQUIRED for all requests to maintain user session state.',
    }
};

export const TOOLS: Tool[] = [
    // Authentication Tools
    {
        name: 'fabits_request_otp',
        description: 'Step 1 of login: Request OTP to be sent to phone number. User must call this first before verifying OTP.',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
                phone_number: {
                    type: 'string',
                    description: 'User phone number with country code (e.g., +917378666101)',
                },
            },
            required: ['user_id', 'phone_number'],
        },
    },
    {
        name: 'fabits_verify_otp',
        description: 'Step 2 of login: Verify OTP and complete login. Stores authentication token for subsequent requests. Must call fabits_request_otp first.',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
                phone_number: {
                    type: 'string',
                    description: 'User phone number with country code (same as used in request_otp)',
                },
                otp: {
                    type: 'string',
                    description: 'One-time password received on phone',
                },
            },
            required: ['user_id', 'phone_number', 'otp'],
        },
    },
    {
        name: 'fabits_status',
        description: 'Check current authentication status and account details including KYC status.',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
            },
            required: ['user_id'],
        },
    },
    {
        name: 'fabits_refresh_token',
        description: 'Refresh expired access token using the stored refresh token. Use this when you get 401/403 errors due to token expiration.',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
            },
            required: ['user_id'],
        },
    },
    {
        name: 'fabits_logout',
        description: 'Logout and clear all stored authentication tokens. User will need to login again to use the service.',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
            },
            required: ['user_id'],
        },
    },

    // Fund Discovery Tools
    {
        name: 'fabits_search_funds',
        description: 'Search for mutual funds by name, category, or keywords. Returns top matching funds with key metrics.',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
                query: {
                    type: 'string',
                    description: 'Search query - MUST be short and specific. Examples: "equity", "HDFC", "debt".',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of results to return (default: 10)',
                },
            },
            required: ['user_id', 'query'],
        },
    },
    {
        name: 'fabits_get_fund_details',
        description: 'Get comprehensive deep-dive details about a specific mutual fund.',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
                fund_id: {
                    type: 'string',
                    description: 'Unique fund identifier',
                },
            },
            required: ['user_id', 'fund_id'],
        },
    },
    {
        name: 'fabits_get_star_funds',
        description: 'Get Fabits curated top recommended mutual funds.',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
            },
            required: ['user_id'],
        },
    },

    // Investment Tools
    {
        name: 'fabits_invest_lumpsum',
        description: 'Place a one-time lumpsum investment order.',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
                fund_id: {
                    type: 'string',
                    description: 'Fund ID to invest in',
                },
                amount: {
                    type: 'number',
                    description: 'Investment amount in rupees',
                },
            },
            required: ['user_id', 'fund_id', 'amount'],
        },
    },
    {
        name: 'fabits_start_sip',
        description: 'Start a Systematic Investment Plan (SIP). Automatically set for 40 years (480 installments).',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
                fund_id: {
                    type: 'string',
                    description: 'Fund ID for SIP',
                },
                monthly_amount: {
                    type: 'number',
                    description: 'Monthly SIP amount in rupees',
                },
                sip_date: {
                    type: 'number',
                    description: 'Date of month for SIP deduction (1-28)',
                },
            },
            required: ['user_id', 'fund_id', 'monthly_amount', 'sip_date'],
        },
    },
    {
        name: 'fabits_redeem',
        description: 'Redeem (sell) mutual fund units.',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
                fund_id: {
                    type: 'string',
                    description: 'Fund ID to redeem from',
                },
                units: {
                    type: 'number',
                    description: 'Number of units to redeem (for partial redemption)',
                },
                amount: {
                    type: 'number',
                    description: 'Amount to redeem in rupees (alternative to units)',
                },
                redemption_type: {
                    type: 'string',
                    enum: ['PARTIAL', 'FULL'],
                    description: 'Type of redemption (default: PARTIAL)',
                },
            },
            required: ['user_id', 'fund_id'],
        },
    },
    {
        name: 'fabits_invest_basket',
        description: 'Invest in a basket of funds.',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
                basket_id: {
                    type: 'string',
                    description: 'Basket ID to invest in',
                },
                amount: {
                    type: 'number',
                    description: 'Total investment amount in rupees',
                },
            },
            required: ['user_id', 'basket_id', 'amount'],
        },
    },
    {
        name: 'fabits_send_transactional_otp',
        description: 'Send transactional OTP for investment.',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
                phone_number: {
                    type: 'string',
                    description: 'User phone number',
                },
                email: {
                    type: 'string',
                    description: 'User email address',
                },
            },
            required: ['user_id', 'phone_number', 'email'],
        },
    },
    {
        name: 'fabits_verify_transactional_otp',
        description: 'Verify transactional OTP.',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
                phone_number: {
                    type: 'string',
                    description: 'User phone number',
                },
                otp: {
                    type: 'string',
                    description: 'OTP received',
                },
            },
            required: ['user_id', 'phone_number', 'otp'],
        },
    },
    {
        name: 'fabits_invest_lumpsum_upi',
        description: 'Initiate UPI lumpsum investment.',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
                scheme_code: {
                    type: 'string',
                    description: 'BSE scheme code',
                },
                amount: {
                    type: 'number',
                    description: 'Investment amount',
                },
                upi_id: {
                    type: 'string',
                    description: 'UPI ID',
                },
                phone_number: {
                    type: 'string',
                    description: 'User phone number',
                },
                email: {
                    type: 'string',
                    description: 'User email',
                },
            },
            required: ['user_id', 'scheme_code', 'amount', 'upi_id', 'phone_number', 'email'],
        },
    },
    {
        name: 'fabits_complete_lumpsum_upi',
        description: 'Complete UPI lumpsum investment after OTP verification.',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
                scheme_code: {
                    type: 'string',
                    description: 'BSE scheme code',
                },
                amount: {
                    type: 'number',
                    description: 'Investment amount',
                },
                upi_id: {
                    type: 'string',
                    description: 'UPI ID',
                },
                phone_number: {
                    type: 'string',
                    description: 'User phone number',
                },
            },
            required: ['user_id', 'scheme_code', 'amount', 'upi_id', 'phone_number'],
        },
    },
    {
        name: 'fabits_check_payment_status',
        description: 'Check payment status for an order.',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
                order_number: {
                    type: 'string',
                    description: 'Order number',
                },
                max_attempts: {
                    type: 'number',
                    description: 'Max attempts',
                },
                interval_seconds: {
                    type: 'number',
                    description: 'Polling interval',
                },
            },
            required: ['user_id', 'order_number'],
        },
    },
    {
        name: 'fabits_setup_basket_mandate',
        description: 'Setup e-mandate for action plan SIP. Uses Savings Bank account with XSIP mandate type.',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
                plan_id: {
                    type: 'number',
                    description: 'Action plan ID',
                },
                phone_number: {
                    type: 'string',
                    description: 'User phone number',
                },
                email: {
                    type: 'string',
                    description: 'User email',
                },
                amount: {
                    type: 'number',
                    description: 'Optional amount override',
                },
                bank_account_number: {
                    type: 'string',
                    description: 'Optional bank account',
                },
                ifsc_code: {
                    type: 'string',
                    description: 'Optional IFSC',
                },
            },
            required: ['user_id', 'plan_id', 'phone_number', 'email'],
        },
    },
    {
        name: 'fabits_invest_basket_sip',
        description: 'Invest in action plan via SIP.',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
                plan_id: {
                    type: 'number',
                    description: 'Action plan ID',
                },
                sip_amount: {
                    type: 'number',
                    description: 'Monthly SIP amount',
                },
                sip_date: {
                    type: 'number',
                    description: 'SIP Date',
                },
                mandate_id: {
                    type: 'string',
                    description: 'Mandate ID',
                },
                phone_number: {
                    type: 'string',
                    description: 'User phone number',
                },
            },
            required: ['user_id', 'plan_id', 'sip_amount', 'sip_date', 'mandate_id', 'phone_number'],
        },
    },
    {
        name: 'fabits_invest_basket_onetime',
        description: 'Invest in action plan via one-time lumpsum.',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
                plan_id: {
                    type: 'number',
                    description: 'Action plan ID',
                },
                amount: {
                    type: 'number',
                    description: 'Investment amount',
                },
                upi_id: {
                    type: 'string',
                    description: 'UPI ID',
                },
                phone_number: {
                    type: 'string',
                    description: 'User phone number',
                },
            },
            required: ['user_id', 'plan_id', 'amount', 'upi_id', 'phone_number'],
        },
    },
    {
        name: 'fabits_get_portfolio',
        description: 'Get complete portfolio overview.',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
            },
            required: ['user_id'],
        },
    },
    {
        name: 'fabits_get_sips',
        description: 'Get all active and inactive SIPs.',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
            },
            required: ['user_id'],
        },
    },
    {
        name: 'fabits_get_transactions',
        description: 'Get transaction history.',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
                limit: {
                    type: 'number',
                    description: 'Limit results',
                },
            },
            required: ['user_id'],
        },
    },
    {
        name: 'fabits_cancel_sip',
        description: 'Cancel an active SIP.',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
                sip_registration_number: {
                    type: 'string',
                    description: 'SIP registration number',
                },
            },
            required: ['user_id', 'sip_registration_number'],
        },
    },
    {
        name: 'fabits_get_basket_holdings',
        description: 'Get basket holdings.',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
            },
            required: ['user_id'],
        },
    },
    {
        name: 'fabits_get_action_plans',
        description: 'Get user action plans.',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
            },
            required: ['user_id'],
        },
    },

    // Investwell Integration Tools
    {
        name: 'investwell_test_transactions',
        description: 'Fetch transactions from Investwell for the authenticated user using their PAN. Requires user to be logged in first. Returns simplified transaction list including date, scheme, type, and amount.',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
                year: {
                    type: 'number',
                    description: 'Year to fetch transactions for (default: current year). Example: 2025',
                },
            },
            required: ['user_id'],
        },
    },
];

