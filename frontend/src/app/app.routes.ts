import { Routes } from '@angular/router';
import { ownerGuard, customerGuard, guestGuard, adminGuard } from './auth.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [guestGuard],
    loadComponent: () => import('./landing/landing.component').then(m => m.LandingComponent),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
  },
  {
    path: 'dashboard',
    canActivate: [ownerGuard],
    loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'customer/dashboard',
    canActivate: [customerGuard],
    loadComponent: () => import('./customer-dashboard/customer-dashboard.component').then(m => m.CustomerDashboardComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
