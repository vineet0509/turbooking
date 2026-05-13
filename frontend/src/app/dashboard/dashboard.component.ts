import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Booking, User } from '../models/booking.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  user: User | null = null;
  activeTab: string = 'overview';
  
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

  // ── Form Models ──────────────────────────────────────────────────────────
  showBookingModal = false;
  bookingForm = { customer: '', phone: '', turf: 'Main Cricket Pitch', date: '', time: '', amount: '800' };

  showCancelModal = false;
  selectedBooking: Booking | null = null;
  cancelForm = { reason: '' };

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.user = this.auth.currentUser as User;
    this.auth.fetchProfile().subscribe({
      next: user => this.user = user as User,
      error: () => this.logout()
    });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  submitBooking(): void {
    const newB: Booking = {
      id: '#BK' + Math.floor(Math.random() * 10000),
      ...this.bookingForm,
      amount: '₹' + this.bookingForm.amount,
      status: 'confirmed',
      cancelReason: '',
      refundStatus: ''
    };
    this.recentBookings = [newB, ...this.recentBookings];
    this.showBookingModal = false;
    
    // Add Notification
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
