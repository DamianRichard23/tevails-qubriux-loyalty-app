import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isLoggingOut = false;

  constructor(private router: Router) {}

  logout(): Promise<boolean> {
    localStorage.clear();
    return this.router.navigate(['/login']);
  }

  logoutDueToUnauthorized(): void {
    if (this.isLoggingOut) {
      return;
    }

    this.isLoggingOut = true;
    void this.logout().finally(() => {
      this.isLoggingOut = false;
    });
  }
}
