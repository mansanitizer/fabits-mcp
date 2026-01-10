
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
        name: 'fabits_sign_up',
        description: 'Register a new user account with Fabits. Required if the phone number is not registered.',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
                first_name: {
                    type: 'string',
                    description: 'User First Name'
                },
                last_name: {
                    type: 'string',
                    description: 'User Last Name'
                },
                email: {
                    type: 'string',
                    description: 'User Email Address'
                },
                phone_number: {
                    type: 'string',
                    description: 'User Mobile Number (10 digits)'
                }
            },
            required: ['user_id', 'first_name', 'last_name', 'email', 'phone_number']
        }
    },
    {
        name: 'fabits_activate_account',
        description: 'Activate a newly created account using the OTP received after signing up. This logs the user in automatically.',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
                phone_number: {
                    type: 'string',
                    description: 'User phone number'
                },
                otp: {
                    type: 'string',
                    description: 'OTP received'
                }
            },
            required: ['user_id', 'phone_number', 'otp']
        }
    },
    {
        name: 'fabits_start_kyc',
        description: 'Initiate the KYC process for a logged-in user. Requires PAN and DOB. Returns a link to complete the video verification.',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
                pan: {
                    type: 'string',
                    description: 'Permanent Account Number (PAN) of the user'
                },
                dob: {
                    type: 'string',
                    description: 'Date of Birth in DD-MM-YYYY format'
                }
            },
            required: ['user_id', 'pan', 'dob']
        }
    },
    {
        name: 'fabits_check_kyc_status',
        description: 'Check the detailed status of the user\'s KYC application.',
        inputSchema: {
            type: 'object',
            properties: {
                user_id: {
                    type: 'string',
                    description: 'User Phone Number (for context)'
                }
            },
            required: ['user_id']
        }
    },
    {
        name: 'fabits_complete_elog_authentication',
        description: 'Trigger the BSE e-Log authentication email for the user. Requires valid Client Code.',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
                client_code: {
                    type: 'string',
                    description: 'User Client Code (obtained after KYC approval)'
                }
            },
            required: ['user_id', 'client_code']
        }
    },
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
        description: 'Start a Systematic Investment Plan (SIP) using an approved mandate. REQUIRES an approved mandate. First use fabits_register_mandate to get a mandate_id, then fabits_check_mandate_status to confirm approval.',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
                scheme_code: {
                    type: 'string',
                    description: 'BSE scheme code (e.g., "INF179K01CC4"). Get this from fund details.',
                },
                monthly_amount: {
                    type: 'number',
                    description: 'Monthly SIP amount in rupees',
                },
                sip_date: {
                    type: 'number',
                    description: 'Date of month for SIP deduction (1-28)',
                },
                mandate_id: {
                    type: 'string',
                    description: 'Approved mandate ID from fabits_register_mandate. Must be APPROVED status.',
                },
            },
            required: ['user_id', 'scheme_code', 'monthly_amount', 'sip_date', 'mandate_id'],
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
        name: 'fabits_get_baskets',
        description: 'Get all available investment baskets (universal baskets). Shows basket ID, name, description, funds, allocations, and minimum investment. Use basket_id with fabits_invest_basket to invest.',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
            },
            required: ['user_id'],
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
        name: 'fabits_complete_lumpsum_netbanking',
        description: 'Complete Lumpsum investment via Netbanking. IMPORTANT: Must verify OTP first using fabits_send_transactional_otp and fabits_verify_transactional_otp. Returns payment link.',
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
                phone_number: {
                    type: 'string',
                    description: 'User phone number',
                },
                email: {
                    type: 'string',
                    description: 'User email address',
                },
            },
            required: ['user_id', 'scheme_code', 'amount', 'phone_number', 'email'],
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
                    description: 'Order number(s). Can be comma-separated.',
                },
            },
            required: ['user_id', 'order_number'],
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
        description: 'Get complete portfolio overview (Managed + External). Shows all holdings including Fabits managed assets and externally linked holdings with current values, returns, and performance metrics.',
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



    // Standalone Mandate Tools
    {
        name: 'fabits_register_mandate',
        description: 'Register a new e-mandate for auto-debit SIPs. Returns mandate ID and authentication URL. User must complete bank authentication at the URL, then use fabits_check_mandate_status to verify. IMPORTANT: Tell user to SAVE the mandate ID - they will need it later!',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
                amount: {
                    type: 'number',
                    description: 'Maximum monthly debit amount allowed for this mandate (in rupees). Should cover all SIPs user plans to set up.',
                },
            },
            required: ['user_id', 'amount'],
        },
    },
    {
        name: 'fabits_check_mandate_status',
        description: 'Check the approval status of a mandate by its ID. Use this after user completes e-mandate bank authentication, or anytime to check a previously registered mandate. Returns APPROVED, PENDING, or FAILED.',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
                mandate_id: {
                    type: 'string',
                    description: 'The mandate ID received from fabits_register_mandate',
                },
            },
            required: ['user_id', 'mandate_id'],
        },
    },
    {
        name: 'fabits_find_user_mandates',
        description: 'Find all mandates for the user. Returns a list of mandates. useful for finding an existing APPROVED mandate to use for new SIPs.',
        inputSchema: {
            type: 'object',
            properties: {
                ...USER_ID_PROP,
                status_filter: {
                    type: 'string',
                    enum: ['APPROVED', 'ALL'],
                    description: 'Filter mandates by status (default: APPROVED). Use ALL to see rejected/failed mandates too.',
                },
            },
            required: ['user_id'],
        },
    },
];

