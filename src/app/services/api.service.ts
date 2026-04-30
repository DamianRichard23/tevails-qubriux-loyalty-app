import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

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

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private baseUrl = 'https://your-api-url.com/api';

  constructor(private http: HttpClient) { }

  /**
   * Login waiter/staff member with email and password
   */
  login(email: string, password: string): Observable<LoginResponse> {
    // TODO: Uncomment when backend is ready
    // const url = `${this.baseUrl}/waiter/login`;
    // return this.http.post<LoginResponse>(url, { email, password });

    // Dummy response - Only success for specific email
    if (email === 'asura@skellam.ai' && password.length > 0) {
      const dummyResponse: LoginResponse = {
        success: true,
        name: 'Laila Petrov',
        phone: '+44 7800 654321',
        email: 'laila.petrov@tevails.com',
        token: 'dummy-jwt-token-12345',
        message: 'Login successful'
      };
      return of(dummyResponse).pipe(delay(500));
    }
    
    // Simulate failed login for wrong email
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
    // TODO: Replace with actual API call
    const dummyCustomer: Customer = {
      id: 1,
      name: 'James Wilson',
      mobileNumber: mobileNumber,
      loyaltyPoints: 420,
      email: 'james.wilson@email.com'
    };
    
    return of(dummyCustomer).pipe(delay(300));
  }

  getDiscountAmount(points: number): Observable<DiscountResponse> {
    // TODO: Replace with actual API call
    const discountAmount = points / 100;
    const dummyResponse: DiscountResponse = {
      pointsToRedeem: points,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      remainingPoints: 420 - points
    };
    
    return of(dummyResponse).pipe(delay(300));
  }

  confirmOrder(orderId: string, amountCollected: number, discountApplied: number = 0): Observable<OrderConfirmationResponse> {
    // TODO: Replace with actual API call
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