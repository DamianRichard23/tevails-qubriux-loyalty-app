import { Component, OnInit } from '@angular/core';
import { ApiService, Customer, DiscountResponse, OrderConfirmationResponse } from '../../services/api.service';
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
  isCalculatingDiscount: boolean = false;
  discountError: string = '';
  discountApplied: boolean = false;

  // Step 2: Order Capture
  orderId: string = '';
  amountCollected: number | null = null;
  isConfirmingOrder: boolean = false;
  orderConfirmed: boolean = false;
  orderConfirmationResponse: OrderConfirmationResponse | null = null;

  // Phone validation patterns
  private readonly phonePatterns = {
    // UK mobile: 07xxx xxxxxx or +44 7xxx xxxxxx
    uk: /^(\+44\s?7\d{3}\s?\d{6}|07\d{3}\s?\d{6}|07\d{9})$/,
    // International: + followed by 7-15 digits
    international: /^\+[1-9]\d{6,14}$/,
    // Basic: at least 10 digits
    basic: /^[\d\s\+\-\(\)]{10,}$/
  };

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Get waiter info from localStorage
    this.waiterName = localStorage.getItem('waiterName') || '';
    this.waiterPhone = localStorage.getItem('waiterPhone') || '';
    this.waiterEmail = localStorage.getItem('waiterEmail') || '';
  }

  /**
   * Validate phone number format
   */
  isValidPhone(phone: string): boolean {
    // Remove spaces, dashes, and parentheses for validation
    const cleanedPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    if (!cleanedPhone) return false;
    
    // Check basic length (minimum 10 digits)
    if (cleanedPhone.replace(/\D/g, '').length < 10) return false;
    
    // Accept any reasonably formatted phone number
    // UK format: 07xxxxxxxxx or +447xxxxxxxxx
    // International: +xxxxxxxxxxxx
    const phoneRegex = /^(\+?\d{1,4})?[\d\s\-\(\)]{7,15}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Validate phone number and return specific error message
   */
  validatePhoneNumber(phone: string): string | null {
    if (!phone || phone.trim() === '') {
      return 'Please enter a mobile number';
    }

    // Remove spaces for digit count
    const digitsOnly = phone.replace(/\D/g, '');
    
    if (digitsOnly.length < 10) {
      return 'Phone number must be at least 10 digits';
    }

    if (digitsOnly.length > 15) {
      return 'Phone number is too long';
    }

    const cleanedPhone = phone.trim();
    
    // UK mobile check
    // const ukMobileRegex = /^(\+44\s?7\d{3}\s?\d{6}|07\d{3}\s?\d{6}|07\d{9}|\+447\d{9})$/;
    // if (ukMobileRegex.test(cleanedPhone.replace(/\s/g, ''))) {
    //   return null; // Valid UK mobile
    // }

    // International format check
    // const internationalRegex = /^\+[1-9]\d{6,14}$/;
    // if (internationalRegex.test(cleanedPhone.replace(/\s/g, ''))) {
    //   return null; // Valid international
    // }

    // Generic phone check
    const genericRegex = /^[\d\s\+\-\(\)]{10,15}$/;
    if (!genericRegex.test(cleanedPhone)) {
      return 'Please enter a valid phone number';
    }

    return null;
  }

  /**
   * Lookup customer by mobile number
   */
  lookupCustomer(): void {
    // Clear previous errors
    this.lookupError = '';

    // Validate phone number
    const validationError = this.validatePhoneNumber(this.customerMobile);
    if (validationError) {
      this.lookupError = validationError;
      return;
    }

    this.isSearching = true;

    // Clean the phone number before sending to API
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

  /**
   * Step 1: Validate points input
   */
  isValidPoints(): boolean {
    return this.pointsToRedeem !== null && 
           this.pointsToRedeem > 0 && 
           this.customer !== null &&
           this.pointsToRedeem <= this.customer.loyaltyPoints;
  }

  /**
   * Step 1: Calculate discount for redemption
   */
  calculateDiscount(): void {
    if (!this.isValidPoints() || !this.pointsToRedeem) return;

    this.isCalculatingDiscount = true;
    this.discountError = '';

    this.apiService.getDiscountAmount(this.pointsToRedeem).subscribe({
      next: (response: DiscountResponse) => {
        this.discountResponse = response;
        this.discountApplied = true;
        this.isCalculatingDiscount = false;
      },
      error: (error: any) => {
        this.discountError = 'Error calculating discount. Please try again.';
        this.isCalculatingDiscount = false;
      }
    });
  }

  /**
   * Get net amount (amount collected minus discount)
   */
  getNetAmount(): number {
    const amount = this.amountCollected || 0;
    const discount = this.discountResponse?.discountAmount || 0;
    return Math.max(0, amount - discount);
  }

  /**
   * Validate order form
   */
  isOrderValid(): boolean {
    return this.orderId.trim() !== '' && 
           this.amountCollected !== null && 
           this.amountCollected > 0;
  }

  /**
   * Step 2: Confirm order
   */
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
      },
      error: (error: any) => {
        console.error('Error confirming order:', error);
        this.isConfirmingOrder = false;
        alert('Error confirming order. Please try again.');
      }
    });
  }

  /**
   * Reset for new customer lookup
   */
  resetAll(): void {
    this.customerMobile = '';
    this.customer = null;
    this.customerFound = false;
    this.lookupError = '';
    this.pointsToRedeem = null;
    this.discountResponse = null;
    this.discountError = '';
    this.discountApplied = false;
    this.orderId = '';
    this.amountCollected = null;
    this.orderConfirmed = false;
    this.orderConfirmationResponse = null;
  }

  /**
   * Logout
   */
  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}