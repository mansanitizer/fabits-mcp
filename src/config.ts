/**
 * Fabits MCP Server Configuration
 * Production environment only
 */

import { homedir } from 'os';
import { join } from 'path';

export const CONFIG = {
  // Production API base URL
  BASE_URL: 'https://apimywealth.fabits.com',

  // Auth token storage location
  TOKEN_FILE: join(homedir(), '.config', 'fabits-mcp', 'auth.json'),

  // API endpoints
  ENDPOINTS: {
    // Authentication
    REQUEST_OTP: '/customerservice/v2/api/customer/validate',
    VERIFY_OTP: '/authserver/api/auth/login/otp',
    REFRESH_TOKEN: '/authserver/api/auth/refresh',
    LOGOUT: '/authserver/api/auth/logout',
    SIGNUP: '/customerservice/api/customer/signup',
    KYC_STATUS: '/customerservice/api/hyperverge/checkKycInitiated',
    KYC_STATUSES: '/customerservice/api/customer/fetchCustomerKycStatuses',

    // Mutual Funds
    ALL_FUNDS: '/mutualfundservice/api/mfData/allFunds',
    FUND_CHART: '/mutualfundservice/api/mfData/chartData',
    FUND_MAIN_INFO: '/mutualfundservice/api/mfData/mainInfo',
    FUND_GENERAL_INFO: '/mutualfundservice/api/mfData/generalInfo',
    BSE_SIP_DATA: '/mutualfundservice/api/mfData/bseSIPData',
    STAR_FUNDS: '/mutualfundservice/api/mfData/fabStarFunds',
    RECENTLY_VIEWED: '/mutualfundservice/api/mfData/recentlyViewed',
    ADD_RECENTLY_VIEWED: '/mutualfundservice/api/mfData/recentlyViewedMF',

    // Orders
    ACTIVE_SIPS: '/mutualfundservice/api/mutualFund/activeSIPs',
    HOLDINGS: '/mutualfundservice/api/mutualFund/holdings',
    ORDER_HISTORY: '/mutualfundservice/api/mutualFund/orderHistory',
    PLACE_ORDER: '/mutualfundservice/api/bseStar/mfOrder/order',
    REDEEM_ORDER: '/mutualfundservice/api/bseStar/mfOrder/redeemOrder',
    SEND_TRANSACTIONAL_OTP: '/mutualfundservice/api/mutualFund/sendTransactionalOtp',
    VERIFY_TRANSACTIONAL_OTP: '/mutualfundservice/api/mutualFund/verifyTransactionalOtp',

    // Baskets
    ALL_BASKETS: '/mutualfundservice/api/basket',
    USER_BASKETS: '/mutualfundservice/api/basket/getAllUserCreatedBasket',
    BASKET_HOLDINGS: '/mutualfundservice/api/basket/holdings',
    BASKET_ORDER_HISTORY: '/mutualfundservice/api/basket/orderHistory',
    BASKET_ONE_TIME_ORDER: '/mutualfundservice/api/basket/oneTimeOrder',
    BASKET_MULTI_ORDER: '/mutualfundservice/api/basket/multiBasketOneTimeOrder',

    // SIPs
    USER_SIPS: '/planservice/api/portfolio/sips',
    CANCEL_XSIP: '/mutualfundservice/api/bseStar/api/XSIPCancellation',

    // Portfolio
    PORTFOLIO_HOLDINGS: '/planservice/api/portfolio/holdings',
    HOLDINGS_BY_SYMBOL: '/planservice/api/portfolio/symbol/holding',
    ORDER_DETAILS: '/planservice/api/portfolio/order',
    HOLDINGS_ORDER_HISTORY: '/planservice/api/portfolio/holding/order',

    // Account
    BANK_DETAILS: '/customerservice/api/customer/bankDetails/v2',
    JOURNEY_MESSAGE: '/customerservice/api/customer/journey/message',
    NOTIFICATIONS: '/customerservice/api/notification',

    // Payments & Mandates
    MANDATE_REGISTRATION: '/mutualfundservice/api/bseStar/mfUpload/mandateRegistration',
    EMANDATE_AUTH_URL: '/mutualfundservice/api/bseStar/mfWebService/eMandateAuthURL',
    MANDATE_DETAILS: '/mutualfundservice/api/bseStar/mfWebService/mandateDetails',
    PAYMENT_STATUS: '/mutualfundservice/api/bseStar/mfUpload/paymentStatus',
    ONE_TIME_PAYMENT: '/mutualfundservice/api/bseStar/api/oneTimePayment',
    MULTI_BASKET_SIP_REGISTRATION: '/mutualfundservice/api/illusion/multiBasketSipRegistrationOrder',
  },

  // Request timeout (30 seconds)
  REQUEST_TIMEOUT: 30000,
} as const;
