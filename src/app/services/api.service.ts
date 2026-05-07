import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface LoginResponse {
  success: boolean;
  name: string;
  phone: string;
  email: string;
  token: string;
  message: string;
}

export interface Customer {
  id: number;
  customerId: string;
  name: string;
  mobileNumber: string;
  loyaltyPoints: number;
  emailAddress?: string;
}

export interface DiscountResponse {
  success: boolean;
  message: string;
  pointsToRedeem: number;
  discountAmount: number;
  netAmount: number;
  remainingPoints: number;
  requestId?: string | null;
}

export interface OrderConfirmationResponse {
  orderId: string;
  pointsEarned: number;
  netAmountPaid: number;
  discountApplied: number;
  message: string;
}

export interface OtpResponse {
  success: boolean;
  message: string;
  otpReference: string;
}

export interface OtpVerifyResponse {
  success: boolean;
  message: string;
  discountAmount: number;
  pointsRedeemed: number;
  remainingPoints: number;
}

interface LoginApiResponse {
  message?: string;
  body?: string;
  token?: string;
  jwtToken?: string;
  accessToken?: string;
  email?: string;
  username?: string;
  userName?: string;
  name?: string;
  fullName?: string;
  phone?: string;
  mobileNumber?: string;
  messageKey?: string | null;
}

interface ApiEnvelope<T> {
  message?: string;
  body?: T;
  messageKey?: string | null;
}

interface CustomerApiResponse {
  loyaltyDetails?: {
    id?: number | string;
    merchantCustomerId?: string;
    availablePoints?: number | string;
  };
  customerDetails?: {
    id?: string;
    merchantCustomerId?: string;
    customerName?: string;
    firstName?: string;
    lastName?: string | null;
    mobileNumber?: string;
    phoneNumber?: string;
    emailAddress?: string | null;
  };
}

interface ValidateRewardApiResponse {
  success?: boolean;
  message?: string;
  grossAmount?: number | string;
  loyaltyPointsToRedeem?: number | string;
  discountOnPoints?: number | string;
  netAmount?: number | string;
  discount?: number | string;
  discountAmount?: number | string;
  redeemValue?: number | string;
  remainingPoints?: number | string;
  balancePoints?: number | string;
  loyaltyPointsApplied?: number | string;
  pointsRedeemed?: number | string;
  requestId?: string | null;
}

interface GenerateOtpApiResponse {
  success?: boolean;
  message?: string;
  requestId?: string | null;
  otpReference?: string | null;
}

interface VerifyOtpApiResponse {
  success?: boolean;
  message?: string;
  discount?: number | string;
  discountAmount?: number | string;
  remainingPoints?: number | string;
  balancePoints?: number | string;
  loyaltyPointsApplied?: number | string;
  pointsRedeemed?: number | string;
}

interface SubmitPurchaseApiResponse {
  success?: boolean;
  message?: string;
  orderId?: string;
  pointsEarned?: number | string;
  netAmount?: number | string;
  netAmountPaid?: number | string;
  discount?: number | string;
  discountApplied?: number | string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = environment.apiBaseUrl;
  readonly otpRequired = environment.otpRequired;
  private readonly apiKey = environment.apiKey;

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<LoginResponse> {
    const url = `${this.baseUrl}/asian5/signin`;

    return this.http.post<LoginApiResponse>(url, {
      username: email,
      password
    }, {
      headers: this.jsonHeaders()
    }).pipe(
      map((response: LoginApiResponse) => {
        const token = response.body || response.token || response.jwtToken || response.accessToken || '';
        const name = response.name || response.fullName || response.userName || response.username || email.split('@')[0];

        return {
          success: response.message === 'SUCCESS' && !!token,
          name,
          phone: response.phone || response.mobileNumber || '',
          email: response.email || email,
          token,
          message: response.message || (token ? 'Login successful' : 'Login failed')
        };
      })
    );
  }

  getCustomerByMobile(mobileNumber: string): Observable<Customer> {
    const url = `${this.baseUrl}/asian5/getCustomer`;

    return this.http.post<ApiEnvelope<CustomerApiResponse>>(url, {
      apiKey: this.apiKey,
      mobileNumber
    }, {
      headers: this.authorizedJsonHeaders()
    }).pipe(
      map((response: ApiEnvelope<CustomerApiResponse>) => {
        const customerResponse = response.body || {};
        const loyaltyDetails = customerResponse.loyaltyDetails || {};
        const customerDetails = customerResponse.customerDetails || {};
        const firstName = customerDetails.firstName || '';
        const lastName = customerDetails.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim();

        return {
          id: this.toNumber(loyaltyDetails.id),
          customerId: customerDetails.id || customerDetails.merchantCustomerId || loyaltyDetails.merchantCustomerId || '',
          name: fullName || customerDetails.customerName || 'Customer',
          mobileNumber: customerDetails.mobileNumber || customerDetails.phoneNumber || mobileNumber,
          loyaltyPoints: this.toNumber(loyaltyDetails.availablePoints),
          emailAddress: customerDetails.emailAddress || ''
        };
      })
    );
  }

  validateReward(customerId: string, grossAmount: number, pointsToRedeem: number): Observable<DiscountResponse> {
    const url = `${this.baseUrl}/asian5/validateReward`;

    return this.http.post<ApiEnvelope<ValidateRewardApiResponse>>(url, {
      apiKey: this.apiKey,
      customerId,
      grossAmount,
      loyaltyPointsApplied: pointsToRedeem
    }, {
      headers: this.authorizedJsonHeaders()
    }).pipe(
      map((response: ApiEnvelope<ValidateRewardApiResponse>) => {
        const rewardResponse = response.body || {};

        return {
        success: response.message === 'SUCCESS' && rewardResponse.success !== false,
        message: rewardResponse.message || response.message || 'Reward validated successfully',
        pointsToRedeem: this.toNumber(
          rewardResponse.loyaltyPointsToRedeem ?? rewardResponse.loyaltyPointsApplied ?? rewardResponse.pointsRedeemed,
          pointsToRedeem
        ),
        discountAmount: this.toNumber(
          rewardResponse.discountOnPoints ?? rewardResponse.discountAmount ?? rewardResponse.discount ?? rewardResponse.redeemValue
        ),
        netAmount: this.toNumber(rewardResponse.netAmount, grossAmount),
        remainingPoints: this.toNumber(rewardResponse.remainingPoints ?? rewardResponse.balancePoints),
        requestId: rewardResponse.requestId ?? null
      };
      })
    );
  }

  sendRedemptionOtp(phoneNumber: string, email: string, points: number): Observable<OtpResponse> {
    const url = `${this.baseUrl}/asian5/redeem/generate-otp`;

    return this.http.post<ApiEnvelope<GenerateOtpApiResponse>>(url, {
      api_key: this.apiKey,
      phoneNumber,
      email,
      points
    }, {
      headers: this.authorizedJsonHeaders()
    }).pipe(
      map((response: ApiEnvelope<GenerateOtpApiResponse>) => {
        const otpResponse = response.body || {};

        return {
          success: response.message === 'SUCCESS' && otpResponse.success !== false,
          message: otpResponse.message || response.message || `OTP sent to ${phoneNumber}`,
          otpReference: otpResponse.requestId || otpResponse.otpReference || ''
        };
      })
    );
  }

  verifyRedemptionOtp(
    phoneNumber: string,
    email: string,
    points: number,
    otp: string,
    requestId: string | null
  ): Observable<OtpVerifyResponse> {
    const url = `${this.baseUrl}/asian5/redeem/verify-otp`;

    return this.http.post<ApiEnvelope<VerifyOtpApiResponse>>(url, {
      api_key: this.apiKey,
      phoneNumber,
      email,
      points,
      otp,
      requestId
    }, {
      headers: this.authorizedJsonHeaders()
    }).pipe(
      map((response: ApiEnvelope<VerifyOtpApiResponse>) => {
        const verifyResponse = response.body || {};

        return {
          success: response.message === 'SUCCESS' && verifyResponse.success !== false,
          message: verifyResponse.message || response.message || 'OTP verified successfully',
          discountAmount: this.toNumber(verifyResponse.discountAmount ?? verifyResponse.discount),
          pointsRedeemed: this.toNumber(verifyResponse.pointsRedeemed ?? verifyResponse.loyaltyPointsApplied, points),
          remainingPoints: this.toNumber(verifyResponse.remainingPoints ?? verifyResponse.balancePoints)
        };
      })
    );
  }

  confirmOrder(
    customerId: string,
    orderId: string,
    grossAmount: number,
    pointsToRedeem: number,
    discountApplied: number,
    netAmount: number
  ): Observable<OrderConfirmationResponse> {
    const url = `${this.baseUrl}/asian5/submitPurchase`;

    return this.http.post<ApiEnvelope<SubmitPurchaseApiResponse>>(url, {
      apiKey: this.apiKey,
      customerId,
      grossAmount,
      loyaltyPointsApplied: pointsToRedeem,
      discount: discountApplied,
      netAmount,
      orderId
    }, {
      headers: this.authorizedJsonHeaders()
    }).pipe(
      map((response: ApiEnvelope<SubmitPurchaseApiResponse>) => {
        const purchaseResponse = response.body || {};

        return {
          orderId: purchaseResponse.orderId || orderId,
          pointsEarned: this.toNumber(purchaseResponse.pointsEarned),
          netAmountPaid: this.toNumber(purchaseResponse.netAmountPaid ?? purchaseResponse.netAmount, netAmount),
          discountApplied: this.toNumber(purchaseResponse.discountApplied ?? purchaseResponse.discount, discountApplied),
          message: purchaseResponse.message || response.message || 'Order confirmed successfully'
        };
      })
    );
  }

  private jsonHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  private authorizedJsonHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    let headers = this.jsonHeaders();

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  private toNumber(value: number | string | undefined | null, fallback: number = 0): number {
    if (value === undefined || value === null || value === '') {
      return fallback;
    }

    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : fallback;
  }
}
