import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
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
  name: string;
  mobileNumber: string;
  loyaltyPoints: number;
  email?: string;
}

export interface DiscountResponse {
  pointsToRedeem: number;
  discountAmount: number;
  remainingPoints: number;
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

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) { }

  login(email: string, password: string): Observable<LoginResponse> {
    if (email === 'asura@skellam.ai' && password.length > 0) {
      const dummyResponse: LoginResponse = {
        success: true,
        name: 'Asura',
        phone: '+44 7800 654321',
        email: 'laila.petrov@tevails.com',
        token: 'dummy-jwt-token-12345',
        message: 'Login successful'
      };
      return of(dummyResponse).pipe(delay(500));
    }
    
    return of({
      success: false,
      name: '',
      phone: '',
      email: '',
      token: '',
      message: 'Invalid credentials'
    }).pipe(delay(500));
  }

  getCustomerByMobile(mobileNumber: string): Observable<Customer> {
    const dummyCustomer: Customer = {
      id: 1,
      name: 'James Wilson',
      mobileNumber: mobileNumber,
      loyaltyPoints: 420,
      email: 'james.wilson@email.com'
    };
    
    return of(dummyCustomer).pipe(delay(300));
  }

  /**
   * Send OTP to customer's mobile for points redemption
   * NOW INCLUDES orderId
   */
  sendRedemptionOtp(points: number, customerMobile: string, orderId: string): Observable<OtpResponse> {
    // TODO: Uncomment when backend is ready
    // const url = `${this.baseUrl}/points/send-redemption-otp`;
    // return this.http.post<OtpResponse>(url, { points, customerMobile, orderId });

    console.log('Sending OTP for:', { points, customerMobile, orderId });
    
    const dummyResponse: OtpResponse = {
      success: true,
      message: `OTP sent to ${customerMobile}`,
      otpReference: 'OTP-REF-' + Math.random().toString(36).substr(2, 9).toUpperCase()
    };
    
    return of(dummyResponse).pipe(delay(500));
  }

  /**
   * Verify OTP and get discount amount
   * NOW INCLUDES orderId
   */
  verifyRedemptionOtp(otpReference: string, otp: string, points: number, orderId: string): Observable<OtpVerifyResponse> {
    // TODO: Uncomment when backend is ready
    // const url = `${this.baseUrl}/points/verify-redemption-otp`;
    // return this.http.post<OtpVerifyResponse>(url, { otpReference, otp, points, orderId });

    console.log('Verifying OTP for:', { otpReference, otp, points, orderId });

    if (otp.length === 6) {
      const discountAmount = points / 100;
      const dummyResponse: OtpVerifyResponse = {
        success: true,
        message: 'OTP verified successfully',
        discountAmount: parseFloat(discountAmount.toFixed(2)),
        pointsRedeemed: points,
        remainingPoints: 420 - points
      };
      return of(dummyResponse).pipe(delay(300));
    }
    
    return of({
      success: false,
      message: 'Invalid OTP. Please try again.',
      discountAmount: 0,
      pointsRedeemed: 0,
      remainingPoints: 0
    }).pipe(delay(300));
  }

  confirmOrder(orderId: string, amountCollected: number, discountApplied: number = 0): Observable<OrderConfirmationResponse> {
    const pointsEarned = Math.floor(amountCollected * 2);
    const netAmountPaid = amountCollected - discountApplied;
    
    const dummyResponse: OrderConfirmationResponse = {
      orderId: orderId,
      pointsEarned: pointsEarned,
      netAmountPaid: parseFloat(netAmountPaid.toFixed(2)),
      discountApplied: discountApplied,
      message: 'Order confirmed successfully'
    };
    
    return of(dummyResponse).pipe(delay(300));
  }
}
