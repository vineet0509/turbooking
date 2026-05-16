import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AdminService, AdminTenant } from '../services/admin.service';
import { User } from '../models/booking.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit {
  user: User | null = null;
  activeMenu = 'overview';
  stats: any[] = [];
  showAboutModal = false;
  showContactModal = false;

  // ── Platform Data ───────────────────────────────────────────────────────
  arenas: AdminTenant[] = [];
  platformStats: any = null;
  globalConfig: any = {
    razorpay_key_id: '',
    razorpay_key_secret: '',
    platform_name: '',
    support_email: ''
  };

  constructor(
    private auth: AuthService, 
    private router: Router,
    private adminService: AdminService
  ) {}

  ngOnInit(): void {
    this.user = this.auth.currentUser as User;
    if (this.user?.role !== 'super_admin') {
      this.router.navigate(['/']);
      return;
    }
    this.loadData();
  }

  loadData(): void {
    this.adminService.getStats().subscribe(res => {
      this.platformStats = res;
      this.stats = [
        { label: 'Total Arenas', value: res.tenants.total.toString(), icon: '🏟️', color: 'blue' },
        { label: 'Platform Revenue', value: '₹' + res.revenue.total.toLocaleString(), icon: '📈', color: 'gold' },
        { label: 'Total Bookings', value: res.bookings.total.toString(), icon: '📅', color: 'green' },
        { label: 'Pending Approvals', value: res.tenants.pending.toString(), icon: '⏳', color: 'orange' },
      ];
    });

    this.adminService.getTenants().subscribe(res => this.arenas = res);
    this.adminService.getSettings().subscribe(res => this.globalConfig = res);
  }

  saveGlobalSettings(): void {
    this.adminService.updateSettings(this.globalConfig).subscribe({
      next: () => alert('Global settings updated!'),
      error: () => alert('Failed to update settings.')
    });
  }

  approveArena(id: string): void {
    if (confirm('Approve this arena?')) {
      this.adminService.updateTenantStatus(id, 'approved').subscribe(() => {
        alert('Arena approved!');
        this.loadData();
      });
    }
  }

  suspendArena(id: string): void {
    if (confirm('Suspend this arena?')) {
      this.adminService.updateTenantStatus(id, 'suspended').subscribe(() => {
        alert('Arena suspended!');
        this.loadData();
      });
    }
  }

  rejectArena(id: string): void {
    if (confirm('Reject this arena registration?')) {
      this.adminService.updateTenantStatus(id, 'suspended').subscribe(() => {
        alert('Arena registration rejected.');
        this.loadData();
      });
    }
  }

  setMenu(menu: string): void {
    this.activeMenu = menu;
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }

  openAbout(): void {
    this.showAboutModal = true;
  }

  openContact(): void {
    this.showContactModal = true;
  }
}
