import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Booking, User } from '../models/booking.model';
import { SubscriptionService } from '../services/subscription.service';
import { TenantService } from '../services/tenant.service';
import { BookingService } from '../services/booking.service';
import { SubscriptionPlan, TenantSubscription } from '../models/subscription.model';
import { Tenant, TurfGround } from '../models/tenant.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  user: User | null = null;
  tenant: Tenant | null = null;
  activeMenu: string = 'dashboard';
  pageTitle: string = 'Dashboard Overview';
  today: string = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  // ── Navigation ──────────────────────────────────────────────────────────
  menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'bookings', label: 'All Bookings', icon: '📅' },
    { id: 'turfs', label: 'My Turfs', icon: '🏟️' },
    { id: 'plans', label: 'Subscription', icon: '💳' },
    { id: 'customers', label: 'Customers', icon: '👥' },
    { id: 'payments', label: 'Payments', icon: '💰' },
    { id: 'settings', label: 'Arena Settings', icon: '⚙️' },
  ];

  setMenu(id: string): void {
    this.activeMenu = id;
    const item = this.menuItems.find(i => i.id === id);
    this.pageTitle = item ? item.label : 'Dashboard';
    this.showNotifications = false;
  }

  // ── Notifications ────────────────────────────────────────────────────────
  showNotifications = false;
  notifications = [
    { id: 1, text: 'New booking from Arjun Kumar for tomorrow', time: '2 mins ago', type: 'success' },
    { id: 2, text: 'Booking #BK1028 cancelled by customer', time: '1 hour ago', type: 'danger' },
    { id: 3, text: 'Payment of ₹1,200 failed for Amit Shah', time: '3 hours ago', type: 'warning' },
  ];

  // ── Dynamic Stats ─────────────────────────────────────────────────────────
  stats = [
    { label: "Today's Bookings", value: '12', icon: '📅', color: 'green' },
    { label: 'Revenue (Month)', value: '₹45,200', icon: '💰', color: 'blue' },
    { label: 'Available Slots', value: '8', icon: '🟢', color: 'purple' },
    { label: 'Total Customers', value: '124', icon: '👥', color: 'orange' },
  ];

  recentBookings: Booking[] = [
    { id: '#BK1024', date: '2026-05-14', time: '08:00 AM', customer: 'Arjun Kumar', turf: 'Main Cricket Pitch', amount: '₹800', status: 'confirmed', phone: '9876543210', cancelReason: '', refundStatus: '' },
    { id: '#BK1025', date: '2026-05-14', time: '10:00 AM', customer: 'Priya Singh', turf: 'Main Cricket Pitch', amount: '₹800', status: 'confirmed', phone: '9876543211', cancelReason: '', refundStatus: '' },
    { id: '#BK1026', date: '2026-05-14', time: '12:00 PM', customer: 'Rahul Verma', turf: 'Football Cage A', amount: '₹1,000', status: 'pending', phone: '9876543212', cancelReason: '', refundStatus: '' },
    { id: '#BK1027', date: '2026-05-14', time: '03:00 PM', customer: 'Sneha Patel', turf: 'Main Cricket Pitch', amount: '₹800', status: 'confirmed', phone: '9876543213', cancelReason: '', refundStatus: '' },
    { id: '#BK1028', date: '2026-05-14', time: '05:00 PM', customer: 'Amit Shah', turf: 'Badminton Court 1', amount: '₹1,200', status: 'cancelled', phone: '9876543214', cancelReason: 'Customer out of station', refundStatus: 'Completed (80%)' },
  ];

  customers = [
    { name: 'Arjun Kumar', email: 'arjun@example.com', phone: '9876543210', totalBookings: 12, lastBooking: '2026-05-13' },
    { name: 'Priya Singh', email: 'priya@example.com', phone: '9876543211', totalBookings: 8, lastBooking: '2026-05-14' },
    { name: 'Rahul Verma', email: 'rahul@example.com', phone: '9876543212', totalBookings: 5, lastBooking: '2026-05-12' },
    { name: 'Sneha Patel', email: 'sneha@example.com', phone: '9876543213', totalBookings: 15, lastBooking: '2026-05-14' },
  ];

  payments = [
    { id: 'PAY_98231', date: '2026-05-14 10:05 AM', customer: 'Priya Singh', amount: '₹800', method: 'UPI', status: 'success' },
    { id: 'PAY_98230', date: '2026-05-14 08:12 AM', customer: 'Arjun Kumar', amount: '₹800', method: 'Card', status: 'success' },
    { id: 'PAY_98229', date: '2026-05-13 09:45 PM', customer: 'Amit Shah', amount: '₹1,200', method: 'UPI', status: 'failed' },
    { id: 'PAY_98228', date: '2026-05-13 05:30 PM', customer: 'Sneha Patel', amount: '₹800', method: 'Cash', status: 'success' },
  ];

  // ── Subscription & Turfs ────────────────────────────────────────────────
  plans: SubscriptionPlan[] = [];
  mySubscription: TenantSubscription | null = null;
  myTurfs: TurfGround[] = [];
  
  showTurfModal = false;
  turfForm: TurfGround = {
    name: '',
    turf_type: 'cricket',
    description: '',
    capacity: 22,
    pitch_type: 'Astro Turf',
    price_per_hour: 800,
    weekend_price_per_hour: 1000
  };

  // ── Form Models ──────────────────────────────────────────────────────────
  showBookingModal = false;
  bookingForm = { customer: '', phone: '', turf: '', date: '', time: '', amount: '800' };

  openBookingModal(): void {
    this.bookingForm = {
      customer: '',
      phone: '',
      date: new Date().toISOString().split('T')[0],
      time: '18:00',
      turf: this.myTurfs.length > 0 ? this.myTurfs[0].name : '',
      amount: '800'
    };
    this.showBookingModal = true;
  }

  showCancelModal = false;
  selectedBooking: Booking | null = null;
  cancelForm = { reason: '' };

  constructor(
    private auth: AuthService, 
    private router: Router,
    private subService: SubscriptionService,
    private tenantService: TenantService,
    private bookingService: BookingService
  ) {}

  ngOnInit(): void {
    this.user = this.auth.currentUser as User;
    this.loadData();
  }

  loadData(): void {
    this.auth.fetchProfile().subscribe({
      next: user => this.user = user as User,
      error: () => this.logout()
    });

    this.subService.getPlans().subscribe(plans => this.plans = plans);
    this.subService.getMySubscription().subscribe(sub => this.mySubscription = sub);
    this.tenantService.getTurfs().subscribe(turfs => this.myTurfs = turfs);
    this.tenantService.getProfile().subscribe(tenant => this.tenant = tenant);
    
    // Load dynamic data
    this.bookingService.getMyBookings().subscribe(data => {
      this.recentBookings = data.map(b => ({
        id: b.booking_ref,
        date: b.date,
        time: b.start_time,
        customer: b.customer,
        turf: b.turf,
        amount: `₹${b.amount}`,
        status: b.status,
        refundStatus: b.status === 'cancelled' ? 'Processing' : ''
      }));
    });

    this.bookingService.getCustomers().subscribe(data => this.customers = data);
    this.bookingService.getPayments().subscribe(data => {
      this.payments = data.map(p => ({
        ...p,
        amount: `₹${p.amount}`
      }));
    });
  }

  saveProfile(): void {
    if (this.tenant) {
      this.tenantService.updateProfile(this.tenant).subscribe({
        next: (res) => {
          this.tenant = res;
          alert('Arena profile updated successfully!');
        },
        error: (err) => alert(err.error?.error || 'Failed to update profile')
      });
    }
  }

  selectPlan(planId: string): void {
    if (confirm('Are you sure you want to subscribe to this plan?')) {
      this.subService.subscribe(planId, 'monthly').subscribe({
        next: (res) => {
          alert(res.message);
          this.loadData();
          this.setMenu('dashboard');
        },
        error: (err) => alert(err.error?.error || 'Failed to subscribe')
      });
    }
  }

  saveTurf(): void {
    if (this.turfForm.id) {
      this.tenantService.updateTurf(this.turfForm.id, this.turfForm).subscribe({
        next: () => {
          this.loadData();
          this.showTurfModal = false;
        },
        error: (err) => alert(err.error?.error || 'Failed to update turf')
      });
    } else {
      this.tenantService.createTurf(this.turfForm).subscribe({
        next: () => {
          this.loadData();
          this.showTurfModal = false;
        },
        error: (err) => alert(err.error?.error || 'Failed to create turf')
      });
    }
  }

  openTurfModal(turf?: TurfGround): void {
    if (turf) {
      this.turfForm = { ...turf };
    } else {
      this.turfForm = {
        name: '',
        turf_type: 'cricket',
        description: '',
        capacity: 22,
        pitch_type: 'Astro Turf',
        price_per_hour: 800,
        weekend_price_per_hour: 1000
      };
    }
    this.showTurfModal = true;
  }

  deleteTurf(id: string): void {
    if (confirm('Are you sure you want to delete this turf?')) {
      this.tenantService.deleteTurf(id).subscribe(() => this.loadData());
    }
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  submitBooking(): void {
    const newB: Booking = {
      id: '#BK' + Math.floor(Math.random() * 10000),
      customer: this.bookingForm.customer,
      phone: this.bookingForm.phone,
      turf: this.bookingForm.turf,
      date: this.bookingForm.date,
      time: this.bookingForm.time,
      amount: '₹' + this.bookingForm.amount,
      status: 'confirmed',
      cancelReason: '',
      refundStatus: ''
    };
    this.recentBookings = [newB, ...this.recentBookings];
    this.showBookingModal = false;
    
    this.notifications.unshift({
      id: Date.now(),
      text: `Manual booking added for ${newB.customer}`,
      time: 'Just now',
      type: 'success'
    });
  }

  openCancel(booking: Booking): void {
    this.selectedBooking = booking;
    this.cancelForm.reason = '';
    this.showCancelModal = true;
  }

  submitCancelBooking(): void {
    if (this.selectedBooking) {
      this.selectedBooking.status = 'cancelled';
      this.selectedBooking.cancelReason = this.cancelForm.reason;
      
      const slotTime = this.parseBookingDate(this.selectedBooking);
      const now = new Date();
      const diffMins = (slotTime.getTime() - now.getTime()) / (1000 * 60);

      if (diffMins > 30) {
        this.selectedBooking.refundStatus = 'Full Refund';
      } else {
        this.selectedBooking.refundStatus = 'Initiated (80%)';
      }
      
      this.showCancelModal = false;
      
      this.notifications.unshift({
        id: Date.now(),
        text: `Booking ${this.selectedBooking.id} cancelled.`,
        time: 'Just now',
        type: 'danger'
      });
    }
  }

  private parseBookingDate(b: Booking): Date {
    const [year, month, day] = b.date.split('-').map(Number);
    let [time, modifier] = b.time.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return new Date(year, month - 1, day, hours, minutes);
  }
}
