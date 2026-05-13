import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../services/auth.service';

export interface Booking {
  id: string;
  date: string;
  time: string;
  customer: string;
  turf: string;
  amount: string;
  status: string;
  phone: string;
  cancelReason: string;
  refundStatus: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  user: User | null = null;
  activeMenu = 'dashboard';

  // ── Mock Data ─────────────────────────────────────────────────────────────
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

  slots = [
    { time: '06:00 AM', basePrice: '₹600', weekendPrice: '₹800', isActive: true },
    { time: '07:00 AM', basePrice: '₹600', weekendPrice: '₹800', isActive: true },
    { time: '08:00 AM', basePrice: '₹800', weekendPrice: '₹1,000', isActive: true },
    { time: '09:00 AM', basePrice: '₹800', weekendPrice: '₹1,000', isActive: true },
    { time: '10:00 AM', basePrice: '₹800', weekendPrice: '₹1,000', isActive: true },
  ];

  menuItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'bookings',  icon: '📅', label: 'Bookings' },
    { id: 'slots',     icon: '🕐', label: 'Slot Config' },
    { id: 'payments',  icon: '💳', label: 'Payments' },
    { id: 'customers', icon: '👥', label: 'Customers' },
    { id: 'settings',  icon: '⚙️', label: 'Settings' },
  ];

  // ── Form States ───────────────────────────────────────────────────────────
  settingsForm = {
    businessName: '',
    phone: '',
    email: '',
    address: '',
    primaryColor: '#10B981',
    openTime: '06:00',
    closeTime: '23:00'
  };

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.user = this.auth.currentUser;
    if (this.user) {
      this.settingsForm.businessName = `${this.user.first_name}'s Turf`;
      this.settingsForm.email = this.user.email;
      this.settingsForm.phone = this.user.phone;
    }
    
    this.auth.fetchProfile().subscribe({
      next: user => {
        this.user = user;
        this.settingsForm.email = user.email;
        this.settingsForm.phone = user.phone;
      },
      error: () => this.logout()
    });
  }

  get pageTitle(): string {
    return this.menuItems.find(m => m.id === this.activeMenu)?.label ?? 'Dashboard';
  }

  get today(): string {
    return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  get userSubdomain(): string {
    if (!this.user?.email) return 'turf';
    return this.user.email.split('@')[0];
  }

  setMenu(id: string): void {
    this.activeMenu = id;
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }

  // ── Manual Booking Form ──────────────────────────────────────────────────
  showBookingModal = false;
  bookingForm = {
    customerName: '',
    customerPhone: '',
    slotTime: '',
    amount: '',
    agreeTerms: false
  };

  // ── Modify Booking Form ──────────────────────────────────────────────────
  showModifyModal = false;
  selectedBooking: any = null;
  modifyForm = {
    date: '',
    slotTime: '',
    customerName: ''
  };

  // ── Cancel Booking Form ──────────────────────────────────────────────────
  showCancelModal = false;
  cancelForm = {
    reason: ''
  };

  get initials(): string {
    if (!this.user) return '?';
    return `${this.user.first_name[0] || ''}${this.user.last_name?.[0] || ''}`.toUpperCase();
  }

  saveSettings(): void {
    alert('Settings saved successfully! (Mock)');
  }

  openManualBooking(): void {
    this.bookingForm = { customerName: '', customerPhone: '', slotTime: '', amount: '', agreeTerms: false };
    this.showBookingModal = true;
  }

  submitManualBooking(): void {
    if (!this.bookingForm.customerName || !this.bookingForm.slotTime) {
      alert('Please fill in required fields.');
      return;
    }
    if (!this.bookingForm.agreeTerms) {
      alert('Please agree to the Terms & Conditions.');
      return;
    }

    const newBooking: Booking = {
      id: '#BK' + Math.floor(1000 + Math.random() * 9000),
      date: this.today, // Current date
      time: this.bookingForm.slotTime,
      customer: this.bookingForm.customerName,
      turf: 'Main Ground', // Default for manual bookings
      phone: this.bookingForm.customerPhone,
      amount: '₹' + (this.bookingForm.amount || '0'),
      status: 'confirmed',
      cancelReason: '',
      refundStatus: ''
    };

    this.recentBookings = [newBooking, ...this.recentBookings];
    this.showBookingModal = false;
    alert('Booking generated successfully!');
  }

  openModifyBooking(booking: any): void {
    this.selectedBooking = booking;
    this.modifyForm = {
      date: '2026-05-14', // Mock default
      slotTime: booking.time,
      customerName: booking.customer
    };
    this.showModifyModal = true;
  }

  submitModifyBooking(): void {
    if (this.selectedBooking) {
      this.selectedBooking.time = this.modifyForm.slotTime;
      this.selectedBooking.customer = this.modifyForm.customerName;
      // In a real app, we'd update the date too
      this.showModifyModal = false;
      alert('Booking modified successfully!');
    }
  }

  cancelBooking(booking: any): void {
    this.selectedBooking = booking;
    this.cancelForm.reason = '';
    this.showCancelModal = true;
  }

  submitCancelBooking(): void {
    if (this.selectedBooking) {
      this.selectedBooking.status = 'cancelled';
      this.selectedBooking.cancelReason = this.cancelForm.reason;
      
      // Check 30 min rule for refund
      const slotTime = this.parseBookingDate(this.selectedBooking);
      const now = new Date();
      const diffMs = slotTime.getTime() - now.getTime();
      const diffMins = diffMs / (1000 * 60);

      if (diffMins > 30) {
        this.selectedBooking.refundStatus = 'Full Refund';
        alert(`Booking cancelled. Full refund has been initiated.`);
      } else {
        this.selectedBooking.refundStatus = 'Initiated (80%)';
        alert(`Booking cancelled. Refund of 80% (minus 20% fee) has been initiated.`);
      }
      
      this.showCancelModal = false;
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

  toggleSlot(slot: any): void {
    slot.isActive = !slot.isActive;
  }

  showTermsModal = false;
  showContactModal = false;

  openTerms() { this.showTermsModal = true; }
  openContact() { this.showContactModal = true; }
}
