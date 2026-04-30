import { Component, OnInit } from '@angular/core';
import { ApiService, Customer, DiscountResponse, OrderConfirmationResponse, OtpResponse, OtpVerifyResponse } from '../../services/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-loyalty-dashboard',
  templateUrl: './loyalty-dashboard.component.html',
  styleUrls: ['./loyalty-dashboard.component.css']
})
export class LoyaltyDashboardComponent implements OnInit {
  // Waiter info from localStorage
  waiterName: string = '';
  waiterPhone: string = '';
  waiterEmail: string = '';

  // Customer Lookup
  customerMobile: string = '';
  customer: Customer | null = null;
  customerFound: boolean = false;
  isSearching: boolean = false;
  lookupError: string = '';

  // Step 1: Redemption
  pointsToRedeem: number | null = null;
  discountResponse: DiscountResponse | null = null;
  isRedeeming: boolean = false;
  discountError: string = '';
  discountApplied: boolean = false;

  // OTP Flow
  showOtpPopup: boolean = false;
  otpReference: string = '';
  otpValue: string = '';
  isSendingOtp: boolean = false;
  isVerifyingOtp: boolean = false;
  otpError: string = '';
  otpSentMessage: string = '';

  // Step 2: Order Capture
  orderId: string = '';
  amountCollected: number | null = null;
  isConfirmingOrder: boolean = false;
  orderConfirmed: boolean = false;
  orderConfirmationResponse: OrderConfirmationResponse | null = null;

  // Order Confirmation Popup
  showConfirmationPopup: boolean = false;

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.waiterName = localStorage.getItem('waiterName') || '';
    this.waiterPhone = localStorage.getItem('waiterPhone') || '';
    this.waiterEmail = localStorage.getItem('waiterEmail') || '';
  }

  validatePhoneNumber(phone: string): string | null {
    if (!phone || phone.trim() === '') {
      return 'Please enter a mobile number';
    }
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      return 'Phone number must be at least 10 digits';
    }
    if (digitsOnly.length > 15) {
      return 'Phone number is too long';
    }
    return null;
  }

  lookupCustomer(): void {
    this.lookupError = '';
    const validationError = this.validatePhoneNumber(this.customerMobile);
    if (validationError) {
      this.lookupError = validationError;
      return;
    }
    this.isSearching = true;
    const cleanedPhone = this.customerMobile.replace(/\s/g, '');
    this.apiService.getCustomerByMobile(cleanedPhone).subscribe({
      next: (customer: Customer) => {
        this.customer = customer;
        this.customerFound = true;
        this.isSearching = false;
      },
      error: (error: any) => {
        this.lookupError = 'Customer not found. Please check the mobile number and try again.';
        this.isSearching = false;
      }
    });
  }

  isValidPoints(): boolean {
    return this.pointsToRedeem !== null && 
           this.pointsToRedeem > 0 && 
           this.customer !== null &&
           this.pointsToRedeem <= this.customer.loyaltyPoints;
  }

  /**
   * NEW: Redeem points - opens OTP popup
   */
  redeemPointsAndGetDiscount(): void {
    if (!this.isValidPoints() || !this.pointsToRedeem || !this.customer) return;

    this.discountError = '';
    this.isRedeeming = true;

    // Step 1: Send OTP to customer's mobile
    this.apiService.sendRedemptionOtp(this.pointsToRedeem, this.customer.mobileNumber).subscribe({
      next: (response: OtpResponse) => {
        if (response.success) {
          this.otpReference = response.otpReference;
          this.otpSentMessage = response.message;
          this.otpValue = '';
          this.otpError = '';
          this.showOtpPopup = true;
        }
        this.isRedeeming = false;
      },
      error: (error: any) => {
        this.discountError = 'Failed to send OTP. Please try again.';
        this.isRedeeming = false;
      }
    });
  }

  /**
   * NEW: Verify OTP
   */
  verifyOtp(): void {
    if (!this.otpValue || this.otpValue.length < 6) {
      this.otpError = 'Please enter a valid 6-digit OTP';
      return;
    }

    this.isVerifyingOtp = true;
    this.otpError = '';

    this.apiService.verifyRedemptionOtp(this.otpReference, this.otpValue, this.pointsToRedeem!).subscribe({
      next: (response: OtpVerifyResponse) => {
        if (response.success) {
          // Set discount response
          this.discountResponse = {
            pointsToRedeem: response.pointsRedeemed,
            discountAmount: response.discountAmount,
            remainingPoints: response.remainingPoints
          };
          this.discountApplied = true;
          
          // Close OTP popup
          this.showOtpPopup = false;
          this.otpValue = '';
          this.otpReference = '';
          this.otpSentMessage = '';
        } else {
          this.otpError = response.message || 'Invalid OTP. Please try again.';
        }
        this.isVerifyingOtp = false;
      },
      error: (error: any) => {
        this.otpError = 'OTP verification failed. Please try again.';
        this.isVerifyingOtp = false;
      }
    });
  }

  /**
   * Resend OTP
   */
  resendOtp(): void {
    if (!this.customer || !this.pointsToRedeem) return;
    
    this.isSendingOtp = true;
    this.otpError = '';
    this.otpValue = '';

    this.apiService.sendRedemptionOtp(this.pointsToRedeem, this.customer.mobileNumber).subscribe({
      next: (response: OtpResponse) => {
        if (response.success) {
          this.otpReference = response.otpReference;
          this.otpSentMessage = response.message;
        }
        this.isSendingOtp = false;
      },
      error: (error: any) => {
        this.otpError = 'Failed to resend OTP. Please try again.';
        this.isSendingOtp = false;
      }
    });
  }

  /**
   * Close OTP popup
   */
  closeOtpPopup(): void {
    this.showOtpPopup = false;
    this.otpValue = '';
    this.otpReference = '';
    this.otpSentMessage = '';
    this.otpError = '';
  }

  getNetAmount(): number {
    const amount = this.amountCollected || 0;
    const discount = this.discountResponse?.discountAmount || 0;
    // return Math.max(0, amount - discount);
    return Math.max(0, amount);
  }

  isOrderValid(): boolean {
    return this.orderId.trim() !== '' && 
           this.amountCollected !== null && 
           this.amountCollected > 0;
  }

  openConfirmationPopup(): void {
    if (!this.isOrderValid()) return;
    this.showConfirmationPopup = true;
  }

  closePopup(): void {
    this.showConfirmationPopup = false;
  }

  confirmOrder(): void {
    if (!this.isOrderValid()) return;

    this.isConfirmingOrder = true;
    const discountApplied = this.discountResponse?.discountAmount || 0;

    this.apiService.confirmOrder(
      this.orderId,
      this.amountCollected!,
      discountApplied
    ).subscribe({
      next: (response: OrderConfirmationResponse) => {
        this.orderConfirmationResponse = response;
        this.orderConfirmed = true;
        this.isConfirmingOrder = false;
        this.showConfirmationPopup = false;
      },
      error: (error: any) => {
        console.error('Error confirming order:', error);
        this.isConfirmingOrder = false;
        this.showConfirmationPopup = false;
        alert('Error confirming order. Please try again.');
      }
    });
  }

  resetAll(): void {
    this.customerMobile = '';
    this.customer = null;
    this.customerFound = false;
    this.lookupError = '';
    this.pointsToRedeem = null;
    this.discountResponse = null;
    this.discountError = '';
    this.discountApplied = false;
    this.isRedeeming = false;
    this.showOtpPopup = false;
    this.otpReference = '';
    this.otpValue = '';
    this.otpError = '';
    this.otpSentMessage = '';
    this.orderId = '';
    this.amountCollected = null;
    this.orderConfirmed = false;
    this.orderConfirmationResponse = null;
    this.showConfirmationPopup = false;
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}