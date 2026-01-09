/**
 * TypeScript type definitions for Fabits API
 */

// ===== Authentication Types =====

export interface AuthToken {
  token: string;
  refreshToken?: string;
  phoneNumber: string;
  expiresAt?: string;
  clientCode?: string;
  panNumber?: string;
}

export interface LoginRequest {
  phoneNumber: string;
  otp: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface KYCStatusResponse {
  status: string;
  data: {
    kycInitiated: boolean;
    kycCompleted: boolean;
    kycStatus?: string;
  };
}

// ===== Mutual Fund Types =====

export interface MutualFund {
  fundId: string;
  fundName: string;
  schemeCode: string;
  isinCode?: string;
  category?: string;
  subCategory?: string;
  nav?: number;
  navDate?: string;
  returns1Y?: number;
  returns3Y?: number;
  returns5Y?: number;
  riskLevel?: string;
  rating?: number;
  minSIPAmount?: number;
  minLumpsumAmount?: number;
  expenseRatio?: number;
  aum?: number;
}

export interface FundDetailsResponse {
  mainInfo?: {
    fundId: string;
    fundName: string;
    category: string;
    subCategory: string;
    nav: number;
    navDate: string;
    returns1Y: number;
    returns3Y: number;
    returns5Y: number;
    riskLevel: string;
    rating: number;
  };
  generalInfo?: {
    fundManager: string;
    expenseRatio: number;
    exitLoad: string;
    aum: number;
    launchDate: string;
    benchmark: string;
  };
  chartData?: {
    date: string;
    nav: number;
  }[];
}

export interface BSESIPData {
  fundId: string;
  sipDates: number[];
  minSIPAmount: number;
  maxSIPAmount: number;
  multiplier: number;
}

// ===== Order Types =====

export interface PlaceOrderRequest {
  fundId: string;
  amount: number;
  orderType: 'PURCHASE' | 'REDEMPTION';
  transactionMode: 'LUMPSUM' | 'SIP';
  sipDate?: number;
  sipFrequency?: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  installments?: number;
}

export interface PlaceOrderResponse {
  status: string;
  data: {
    orderId: string;
    bseOrderId?: string;
    status: string;
    message?: string;
    paymentLink?: string;
  };
}

export interface RedeemOrderRequest {
  fundId: string;
  units?: number;
  amount?: number;
  redemptionType: 'PARTIAL' | 'FULL';
}

export interface Holding {
  fundId: string;
  fundName: string;
  schemeCode: string;
  units: number;
  avgNav: number;
  currentNav: number;
  investedValue: number;
  currentValue: number;
  returns: number;
  returnsPercentage: number;
  folioNumber?: string;
}

export interface SIP {
  sipRegistrationNumber: string;
  fundId: string;
  fundName: string;
  amount: number;
  sipDate: number;
  frequency: string;
  startDate: string;
  endDate?: string;
  installmentsPaid: number;
  totalInstallments?: number;
  status: 'ACTIVE' | 'CANCELLED' | 'COMPLETED';
}

export interface Order {
  orderId: string;
  fundId: string;
  fundName: string;
  orderType: 'PURCHASE' | 'REDEMPTION';
  transactionMode: 'LUMPSUM' | 'SIP';
  amount: number;
  units?: number;
  nav?: number;
  status: string;
  orderDate: string;
  settlementDate?: string;
}

// ===== Basket Types =====

export interface Basket {
  basketId: string;
  basketName: string;
  description: string;
  category: string;
  riskLevel: string;
  minAmount: number;
  expectedReturns?: number;
  funds: {
    fundId: string;
    fundName: string;
    allocation: number; // percentage
  }[];
}

export interface BasketOrderRequest {
  basketId: string;
  amount: number;
}

// ===== Portfolio Types =====

export interface Portfolio {
  totalInvested: number;
  currentValue: number;
  totalReturns: number;
  totalReturnsPercentage: number;
  holdings: Holding[];
  xirr?: number;
}

// ===== API Response Wrapper =====

export interface APIResponse<T = any> {
  status: string;
  data?: T;
  message?: string;
  isError?: boolean;
  response?: {
    message: string;
  };
}

// ===== Error Types =====

export interface APIError {
  isError: true;
  status: number;
  response: {
    message: string;
  };
}
