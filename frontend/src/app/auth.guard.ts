import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn && auth.currentUser?.role === 'super_admin') {
    return true;
  }
  router.navigate(['/']);
  return false;
};

export const ownerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn) {
    const role = auth.currentUser?.role;
    if (role === 'turf_owner') return true;
    if (role === 'super_admin') { router.navigate(['/admin']); return false; }
    if (role === 'customer') { router.navigate(['/customer/dashboard']); return false; }
  }
  router.navigate(['/']);
  return false;
};

export const customerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn) {
    const role = auth.currentUser?.role;
    if (role === 'customer') return true;
    if (role === 'super_admin') { router.navigate(['/admin']); return false; }
    if (role === 'turf_owner') { router.navigate(['/dashboard']); return false; }
  }
  router.navigate(['/']);
  return false;
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn) return true;

  const user = auth.currentUser;
  if (user?.role === 'super_admin') {
    router.navigate(['/admin']);
  } else if (user?.role === 'customer') {
    router.navigate(['/customer/dashboard']);
  } else {
    router.navigate(['/dashboard']);
  }
  return false;
};
