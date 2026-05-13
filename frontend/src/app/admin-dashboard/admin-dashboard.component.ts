import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
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

  // ── Platform Stats ───────────────────────────────────────────────────────
  stats = [
    { label: 'Total Arenas', value: '42', icon: '🏟️', color: 'blue' },
    { label: 'Platform Revenue', value: '₹2,45,000', icon: '📈', color: 'gold' },
    { label: 'Active Players', value: '1,850', icon: '🏃', color: 'green' },
    { label: 'Pending Approvals', value: '3', icon: '⏳', color: 'orange' },
  ];

  // ── Pending Arena Registrations ──────────────────────────────────────────
  pendingArenas = [
    { id: 'TNT_991', name: 'Sky Turf Bangalore', owner: 'Vikram Rao', date: '2026-05-13', status: 'pending' },
    { id: 'TNT_992', name: 'Elite Football Club', owner: 'Sanjay Dutt', date: '2026-05-14', status: 'pending' },
    { id: 'TNT_993', name: 'Grassroot Arena', owner: 'Anita Gill', date: '2026-05-14', status: 'pending' },
  ];

  // ── Subscription Tiers ───────────────────────────────────────────────────
  subscriptions = [
    { plan: 'Pro Monthly', count: 28, revenue: '₹42,000' },
    { plan: 'Enterprise Yearly', count: 14, revenue: '₹1,68,000' },
  ];

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.user = this.auth.currentUser as User;
    if (this.user?.role !== 'super_admin') {
      this.router.navigate(['/']);
    }
  }

  approveArena(arena: any): void {
    arena.status = 'approved';
    alert(`${arena.name} has been approved and their subdomain is now active.`);
  }

  rejectArena(arena: any): void {
    arena.status = 'rejected';
    alert(`${arena.name} registration has been rejected.`);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
