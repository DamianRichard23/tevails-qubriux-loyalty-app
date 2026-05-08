import { Component, OnDestroy, OnInit } from '@angular/core';
import { ApiService, Customer, DiscountResponse, OrderConfirmationResponse, OtpResponse, OtpVerifyResponse } from '../../services/api.service';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-loyalty-dashboard',
  templateUrl: './loyalty-dashboard.component.html',
  styleUrls: ['./loyalty-dashboard.component.css']
})
export class LoyaltyDashboardComponent implements OnInit, OnDestroy {
  // Waiter info from localStorage
  waiterName: string = '';
  waiterPhone: string = '';
  waiterEmail: string = '';

  // Customer Lookup
  customerMobile: string = '';
  customer: Customer | null = null;
  customerFound: boolean = false;
  isSearching: boolean = false;
  isRefreshingCustomer: boolean = false;
  lookupError: string = '';

  // Step 1: Gross Amount (Mandatory)
  orderId: string = '';
  isOrderIdValid: boolean = false;

  // Step 2: Redemption
  pointsToRedeem: number | null = null;
  discountResponse: DiscountResponse | null = null;
  isRedeeming: boolean = false;
  discountError: string = '';
  discountApplied: boolean = false;
  rewardValidated: boolean = false;
  readonly otpRequired: boolean = environment.otpRequired;
  isAutoValidating: boolean = false;

  // OTP Flow
  showOtpPopup: boolean = false;
  otpReference: string = '';
  otpValue: string = '';
  isSendingOtp: boolean = false;
  isVerifyingOtp: boolean = false;
  otpError: string = '';
  otpSentMessage: string = '';
  otpValidationSuccessMessage: string = '';
  isOtpVerifiedForCurrentPoints: boolean = false;

  // Step 3: Order Capture
  grossAmount: number | null = null;
  amountCollected: number | null = null;
  isConfirmingOrder: boolean = false;
  orderConfirmed: boolean = false;
  orderConfirmationResponse: OrderConfirmationResponse | null = null;

  // Order Confirmation Popup
  showConfirmationPopup: boolean = false;
  private validateDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private validationRequestVersion: number = 0;

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.waiterName = localStorage.getItem('waiterName') || '';
    this.waiterPhone = localStorage.getItem('waiterPhone') || '';
    this.waiterEmail = localStorage.getItem('waiterEmail') || '';
  }

  ngOnDestroy(): void {
    this.clearValidateDebounce();
  }

  validatePhoneNumber(phone: string): string | null {
    if (!phone || phone.trim() === '') {
      return 'Please enter a mobile number';
    }
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 8) {
      return 'Phone number must be at least 8 digits';
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

  refreshCustomerPoints(): void {
    if (!this.customer) {
      return;
    }

    this.lookupError = '';
    this.isRefreshingCustomer = true;

    this.apiService.getCustomerByMobile(this.customer.mobileNumber).subscribe({
      next: (customer: Customer) => {
        this.customer = customer;
        this.clearRedemptionState(true);

        if (this.grossAmount !== null && this.grossAmount > 0) {
          this.pointsToRedeem = customer.loyaltyPoints > 0 ? customer.loyaltyPoints : null;
          this.scheduleRewardValidation();
        }

        this.isRefreshingCustomer = false;
      },
      error: () => {
        this.lookupError = 'Unable to refresh customer points. Please try again.';
        this.isRefreshingCustomer = false;
      }
    });
  }

  // ==================== STEP 1: GROSS AMOUNT ====================
  
  validateRequiredFields(): void {
    this.isOrderIdValid = this.orderId.trim().length > 0;
  }

  areRequiredFieldsFilled(): boolean {
    return this.grossAmount !== null && this.grossAmount > 0;
  }

  onGrossAmountChange(): void {
    this.clearRedemptionState(false);

    if (!this.customer) {
      return;
    }

    if (this.grossAmount === null || this.grossAmount <= 0) {
      this.clearRedemptionState(true);
      this.amountCollected = null;
      return;
    }

    this.pointsToRedeem = this.customer.loyaltyPoints > 0 ? this.customer.loyaltyPoints : null;
    this.scheduleRewardValidation();
  }

  onPointsChange(): void {
    this.clearRedemptionState(false);
    this.scheduleRewardValidation();
  }

  preventScrollValueChange(event: WheelEvent): void {
    const input = event.target as HTMLInputElement | null;
    input?.blur();
  }

  // ==================== STEP 2: REDEMPTION ====================

  isValidPoints(): boolean {
    return this.pointsToRedeem !== null && 
           this.pointsToRedeem > 0 && 
           this.grossAmount !== null &&
           this.grossAmount > 0 &&
           this.customer !== null &&
           this.pointsToRedeem <= this.customer.loyaltyPoints;
  }

  hasPointsExceeded(): boolean {
    return this.pointsToRedeem !== null &&
           this.customer !== null &&
           this.pointsToRedeem > this.customer.loyaltyPoints;
  }

  redeemPointsAndGetDiscount(): void {
    if (!this.isValidPoints()) return;
    this.runRewardValidation(true);
  }

  isValidateButtonDisabled(): boolean {
    return !this.isValidPoints() || this.isRedeeming || this.isAutoValidating || this.isOtpVerifiedForCurrentPoints;
  }

  verifyOtp(): void {
    if (!this.customer || !this.pointsToRedeem || !this.otpValue || this.otpValue.length < 4) {
      this.otpError = 'Please enter a valid OTP';
      return;
    }

    this.isVerifyingOtp = true;
    this.otpError = '';

    this.apiService.verifyRedemptionOtp(
      this.customer.mobileNumber,
      this.customer.emailAddress || '',
      this.pointsToRedeem,
      this.otpValue,
      this.otpReference || null
    ).subscribe({
      next: (response: OtpVerifyResponse) => {
        if (response.success) {
          const existingDiscount = this.discountResponse;
          const resolvedPointsRedeemed =
            response.pointsRedeemed ?? existingDiscount?.pointsToRedeem ?? this.pointsToRedeem ?? 0;
          const resolvedDiscountAmount = response.discountAmount ?? existingDiscount?.discountAmount ?? 0;
          const resolvedRemainingPoints =
            response.remainingPoints ??
            existingDiscount?.remainingPoints ??
            ((this.customer?.loyaltyPoints ?? 0) - resolvedPointsRedeemed);

          this.discountResponse = {
            success: true,
            message: response.message,
            pointsToRedeem: resolvedPointsRedeemed,
            discountAmount: resolvedDiscountAmount,
            netAmount: existingDiscount?.netAmount ?? 0,
            remainingPoints: Math.max(resolvedRemainingPoints, 0),
            requestId: this.otpReference || null
          };
          this.discountApplied = true;
          this.rewardValidated = true;
          this.isOtpVerifiedForCurrentPoints = true;
          this.otpValidationSuccessMessage = 'OTP validation successful.';
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

  resendOtp(): void {
    if (!this.customer || !this.pointsToRedeem) return;
    
    this.isSendingOtp = true;
    this.otpError = '';
    this.otpValue = '';

    this.apiService.sendRedemptionOtp(
      this.customer.mobileNumber,
      this.customer.emailAddress || '',
      this.pointsToRedeem
    ).subscribe({
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

  closeOtpPopup(): void {
    this.showOtpPopup = false;
    this.otpValue = '';
    this.otpSentMessage = '';
    this.otpError = '';
  }

  // ==================== STEP 3: ORDER CAPTURE ====================

  getNetAmount(): number {
    return this.amountCollected || 0;
  }

  getAppliedDiscountAmount(): number {
    return this.discountResponse?.discountAmount || 0;
  }

  isOrderCaptureValid(): boolean {
    const redemptionRequested = this.pointsToRedeem !== null && this.pointsToRedeem > 0;

    return this.orderId.trim().length > 0 &&
           this.grossAmount !== null &&
           this.grossAmount > 0
  }

  getEstimatedPoints(): number {
    return Math.floor((this.amountCollected || 0) * 2);
  }

  openConfirmationPopup(): void {
    if (!this.isOrderCaptureValid()) return;
    this.normalizeAmountCollectedForConfirmation();
    this.normalizeRedemptionForConfirmation();
    this.showConfirmationPopup = true;
  }

  closePopup(): void {
    this.showConfirmationPopup = false;
  }

  confirmOrder(): void {
    if (!this.isOrderCaptureValid() || !this.customer || this.grossAmount === null) return;

    this.normalizeAmountCollectedForConfirmation();
    this.normalizeRedemptionForConfirmation();
    this.isConfirmingOrder = true;
    const amountCollected = this.amountCollected ?? 0;
    const discountApplied = this.discountResponse?.discountAmount || 0;
    const pointsToRedeem = this.discountResponse?.pointsToRedeem || 0;

    this.apiService.confirmOrder(
      this.customer.customerId,
      this.orderId,
      this.grossAmount,
      pointsToRedeem,
      discountApplied,
      amountCollected
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
    this.clearValidateDebounce();
    this.customerMobile = '';
    this.customer = null;
    this.customerFound = false;
    this.lookupError = '';
    this.orderId = '';
    this.isOrderIdValid = false;
    this.pointsToRedeem = null;
    this.discountResponse = null;
    this.discountError = '';
    this.discountApplied = false;
    this.rewardValidated = false;
    this.isRedeeming = false;
    this.showOtpPopup = false;
    this.otpReference = '';
    this.otpValue = '';
    this.otpError = '';
    this.otpSentMessage = '';
    this.otpValidationSuccessMessage = '';
    this.isOtpVerifiedForCurrentPoints = false;
    this.grossAmount = null;
    this.amountCollected = null;
    this.orderConfirmed = false;
    this.orderConfirmationResponse = null;
    this.showConfirmationPopup = false;
  }

  private clearRedemptionState(resetPoints: boolean): void {
    this.validationRequestVersion++;

    if (resetPoints) {
      this.pointsToRedeem = null;
    }

    this.discountResponse = null;
    this.discountError = '';
    this.discountApplied = false;
    this.rewardValidated = false;
    this.isRedeeming = false;
    this.showOtpPopup = false;
    this.otpReference = '';
    this.otpValue = '';
    this.otpError = '';
    this.otpSentMessage = '';
    this.otpValidationSuccessMessage = '';
    this.isOtpVerifiedForCurrentPoints = false;
    this.isAutoValidating = false;
  }

  private scheduleRewardValidation(): void {
    this.clearValidateDebounce();

    if (!this.customer || this.grossAmount === null || this.grossAmount <= 0) {
      return;
    }

    if (this.customer.loyaltyPoints <= 0) {
      this.pointsToRedeem = null;
      this.amountCollected = this.grossAmount;
      return;
    }

    if (
      this.pointsToRedeem === null ||
      this.pointsToRedeem <= 0 ||
      this.pointsToRedeem > this.customer.loyaltyPoints
    ) {
      this.amountCollected = this.otpRequired ? null : this.grossAmount;
      return;
    }

    this.validateDebounceTimer = setTimeout(() => {
      this.runRewardValidation(false);
    }, 300);
  }

  private clearValidateDebounce(): void {
    if (this.validateDebounceTimer) {
      clearTimeout(this.validateDebounceTimer);
      this.validateDebounceTimer = null;
    }
  }

  private normalizeRedemptionForConfirmation(): void {
    if (this.discountResponse && this.discountApplied) {
      return;
    }

    this.pointsToRedeem = 0;
    this.discountResponse = null;
    this.discountApplied = false;
    this.rewardValidated = false;
    this.discountError = '';
  }

  private normalizeAmountCollectedForConfirmation(): void {
    if (this.amountCollected === null) {
      this.amountCollected = 0;
    }
  }

  private runRewardValidation(triggeredByButton: boolean): void {
    if (!this.isValidPoints() || !this.pointsToRedeem || !this.customer || this.grossAmount === null) {
      return;
    }

    this.clearValidateDebounce();
    this.discountError = '';
    this.otpValidationSuccessMessage = '';
    this.isOtpVerifiedForCurrentPoints = false;
    this.isRedeeming = triggeredByButton;
    this.isAutoValidating = !triggeredByButton;
    const requestVersion = ++this.validationRequestVersion;

    this.apiService.validateReward(
      this.customer.customerId,
      this.grossAmount,
      this.pointsToRedeem
    ).subscribe({
      next: (response: DiscountResponse) => {
        if (requestVersion !== this.validationRequestVersion) {
          return;
        }

        if (!response.success) {
          this.discountResponse = null;
          this.discountApplied = false;
          this.rewardValidated = false;
          this.discountError = response.message || 'Reward validation failed. Please try again.';
          this.isRedeeming = false;
          this.isAutoValidating = false;
          return;
        }

        this.rewardValidated = true;
        this.discountApplied = true;
        this.discountResponse = response;
        this.pointsToRedeem = response.pointsToRedeem;
        this.discountError = '';
        
        if (triggeredByButton && this.otpRequired) {
          this.apiService.sendRedemptionOtp(
            this.customer!.mobileNumber,
            this.customer!.emailAddress || '',
            response.pointsToRedeem
          ).subscribe({
            next: (otpResponse: OtpResponse) => {
              if (requestVersion !== this.validationRequestVersion) {
                return;
              }

              if (otpResponse.success) {
                this.otpReference = otpResponse.otpReference;
                this.otpSentMessage = otpResponse.message;
                this.otpValue = '';
                this.otpError = '';
                this.showOtpPopup = true;
                this.discountError = '';
              } else {
                this.discountError = otpResponse.message || 'Failed to send OTP. Please try again.';
              }

              this.isRedeeming = false;
              this.isAutoValidating = false;
            },
            error: () => {
              if (requestVersion !== this.validationRequestVersion) {
                return;
              }

              this.discountError = 'Failed to send OTP. Please try again.';
              this.isRedeeming = false;
              this.isAutoValidating = false;
            }
          });
          return;
        }

        this.isRedeeming = false;
        this.isAutoValidating = false;
      },
      error: () => {
        if (requestVersion !== this.validationRequestVersion) {
          return;
        }

        this.discountResponse = null;
        this.discountApplied = false;
        this.rewardValidated = false;
        this.amountCollected = this.otpRequired ? null : this.grossAmount;
        this.discountError = 'Reward validation failed. Please try again.';
        this.isRedeeming = false;
        this.isAutoValidating = false;
      }
    });
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
