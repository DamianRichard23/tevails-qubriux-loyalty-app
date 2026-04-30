import { Component } from '@angular/core';
import { ApiService, LoginResponse } from '../../services/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(
    private router: Router,
    private apiService: ApiService
  ) {}

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  /**
   * Handle login form submission
   */
  onLogin(): void {
    // Clear previous errors
    this.errorMessage = '';

    // Validate email format
    if (!this.email || !this.isValidEmail(this.email)) {
      this.errorMessage = 'Please enter a valid email address';
      return;
    }

    // Validate password
    if (!this.password) {
      this.errorMessage = 'Please enter your password';
      return;
    }

    this.isLoading = true;

    this.apiService.login(this.email, this.password).subscribe({
      next: (response: LoginResponse) => {
        if (response.success) {
          // Store waiter info in localStorage
          localStorage.setItem('waiterName', response.name);
          localStorage.setItem('waiterPhone', response.phone);
          localStorage.setItem('waiterEmail', response.email);
          localStorage.setItem('token', response.token);
          
          this.isLoading = false;
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage = response.message || 'Invalid credentials. Please try again.';
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Login error:', error);
        this.errorMessage = 'Invalid email or password. Please try again.';
        this.isLoading = false;
      }
    });
  }
}