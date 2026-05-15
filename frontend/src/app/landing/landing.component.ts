import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent implements OnInit {
  title = 'frontend';

  // ── Modal State ───────────────────────────────────────────────
  showRegisterModal = false;
  showLoginModal = false;
  showTermsModal = false;
  isCustomerRegister = false;
  selectedSlot: string | null = null;

  // ── Register Form ─────────────────────────────────────────────
  registerForm = {
    first_name: '',
    last_name: '',
    businessName: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    plan: 'pro',
    agreeTerms: false,
  };
  registerLoading = false;
  registerError = '';

  // ── Login Form ────────────────────────────────────────────────
  loginForm = { email: '', password: '' };
  loginLoading = false;
  loginError = '';
  showLoginPassword = false;

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    if (this.auth.isLoggedIn) {
      const user = this.auth.currentUser;
      if (user?.role === 'customer') {
        this.router.navigate(['/customer/dashboard']);
      } else if (user?.role === 'super_admin') {
        this.router.navigate(['/admin']);
      } else {
        this.router.navigate(['/dashboard']);
      }
    }
  }

  openRegister(plan = 'pro'): void {
    this.isCustomerRegister = false;
    this.registerForm.plan = plan;
    this.registerError = '';
    this.showRegisterModal = true;
    this.showLoginModal = false;
    document.body.style.overflow = 'hidden';
  }

  openCustomerRegister(): void {
    this.isCustomerRegister = true;
    this.registerError = '';
    this.showRegisterModal = true;
    this.showLoginModal = false;
    document.body.style.overflow = 'hidden';
  }

  submitRegister(): void {
    const { first_name, email, phone, password, confirm_password, businessName } = this.registerForm;
    
    if (!first_name || !email || !password || !confirm_password) {
      this.registerError = 'Please fill in all required fields.';
      return;
    }

    if (!this.isCustomerRegister && !businessName) {
      this.registerError = 'Business Name is required for arena owners.';
      return;
    }
    if (password !== confirm_password) {
      this.registerError = 'Passwords do not match.';
      return;
    }
    if (!this.registerForm.agreeTerms) {
      this.registerError = 'You must agree to the Terms & Conditions to continue.';
      return;
    }
    if (password.length < 8) {
      this.registerError = 'Password must be at least 8 characters.';
      return;
    }

    this.registerLoading = true;
    this.registerError = '';

    this.auth.register({
      first_name,
      last_name: this.registerForm.last_name,
      business_name: this.isCustomerRegister ? '' : this.registerForm.businessName, 
      email,
      phone,
      password,
      confirm_password,
      plan: this.registerForm.plan,
      role: this.isCustomerRegister ? 'customer' : 'turf_owner'
    } as any).subscribe({
      next: () => {
        this.closeAllModals();
        if (this.isCustomerRegister) {
          this.router.navigate(['/customer/dashboard']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.registerLoading = false;
        const data = err.error;
        if (data && typeof data === 'object') {
          const msgs = Object.values(data).flat();
          this.registerError = msgs.join(' ');
        } else {
          this.registerError = 'Registration failed. Please try again.';
        }
      }
    });
  }

  // ── Login ─────────────────────────────────────────────────────
  openLogin(): void {
    this.loginError = '';
    this.loginForm = { email: '', password: '' };
    this.showLoginModal = true;
    this.showRegisterModal = false;
    document.body.style.overflow = 'hidden';
  }

  submitLogin(): void {
    if (!this.loginForm.email || !this.loginForm.password) {
      this.loginError = 'Email and password are required.';
      return;
    }
    this.loginLoading = true;
    this.loginError = '';

    this.auth.login(this.loginForm).subscribe({
      next: (res) => {
        this.closeAllModals();
        const role = res.user.role;
        if (role === 'super_admin') {
          this.router.navigate(['/admin']);
        } else if (role === 'customer') {
          this.router.navigate(['/customer/dashboard']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.loginLoading = false;
        const data = err.error;
        if (data?.non_field_errors) {
          this.loginError = data.non_field_errors[0];
        } else if (data?.detail) {
          this.loginError = data.detail;
        } else {
          this.loginError = 'Invalid email or password.';
        }
      }
    });
  }

  // ── Shared ────────────────────────────────────────────────────
  closeModal(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.closeAllModals();
    }
  }

  closeAllModals(): void {
    this.showRegisterModal = false;
    this.showLoginModal = false;
    this.showTermsModal = false;
    document.body.style.overflow = '';
    this.registerLoading = false;
    this.loginLoading = false;
  }

  openTerms(): void {
    this.showTermsModal = true;
  }

  scrollToDemo(): void {
    document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  selectDemoSlot(event: MouseEvent): void {
    const el = event.target as HTMLElement;
    document.querySelectorAll('.slot.selected').forEach(s => s.classList.remove('selected'));
    el.classList.add('selected');
    this.selectedSlot = el.textContent?.trim() || null;
  }

  switchToLogin(): void {
    this.showRegisterModal = false;
    this.loginError = '';
    this.loginForm = { email: '', password: '' };
    this.showLoginModal = true;
  }

  switchToRegister(): void {
    this.showLoginModal = false;
    this.registerError = '';
    this.showRegisterModal = true;
  }
}
