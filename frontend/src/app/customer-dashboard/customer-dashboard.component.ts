import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../services/auth.service';
import { BookingService } from '../services/booking.service';

export interface Booking {
  id: string;
  turf: string;
  date: string;
  time: string;
  amount: string;
  status: string;
  reason?: string;
  refundStatus?: string;
}

@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-dashboard.component.html',
  styleUrl: './customer-dashboard.component.css'
})
export class CustomerDashboardComponent implements OnInit {
  user: User | null = null;
  myBookings: Booking[] = [];
  isLoading = true;

  showCancelModal = false;
  showRescheduleModal = false;
  selectedBooking: any = null;
  cancelReason: string = '';
  
  // Real-time Slot Availability Mock
  availableSlots = [
    { time: '06:00 PM', status: 'available' },
    { time: '07:00 PM', status: 'available' },
    { time: '08:00 PM', status: 'booked' },
    { time: '09:00 PM', status: 'available' },
    { time: '10:00 PM', status: 'available' },
    { time: '11:00 PM', status: 'available' }
  ];
  
  newSlot: string = '';

  showNewBookingModal = false;
  bookingStep: 'details' | 'payment' | 'processing' | 'success' = 'details';
  
  newBookingForm = {
    turf: 'Green Arena',
    date: new Date().toISOString().split('T')[0],
    time: ''
  };

  constructor(
    private auth: AuthService, 
    private bookingService: BookingService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.user = this.auth.currentUser;
    this.loadBookings();
    
    this.auth.fetchProfile().subscribe({
      next: user => this.user = user,
      error: () => this.logout()
    });
  }

  loadBookings(): void {
    this.isLoading = true;
    // For now, combining real API structure with mock data for safety
    this.bookingService.getMyBookings().subscribe({
      next: (data) => {
        this.myBookings = data;
        this.isLoading = false;
      },
      error: () => {
        // Fallback to mock if API not ready
        this.myBookings = [
          { id: '#BK8821', turf: 'Green Arena', date: '2026-05-14', time: '08:00 AM', amount: '₹800', status: 'confirmed', reason: '', refundStatus: '' },
          { id: '#BK8845', turf: 'City Sports Club', date: '2026-05-15', time: '05:00 PM', amount: '₹1,000', status: 'confirmed', reason: '', refundStatus: '' },
        ];
        this.isLoading = false;
      }
    });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }

  canCancel(booking: any): boolean {
    return booking.status === 'confirmed'; 
  }

  getRefundAmount(amountStr: string | undefined): string {
    if (!amountStr || !this.selectedBooking) return '₹0';
    const amount = parseInt(amountStr.replace('₹', '').replace(',', ''));
    
    const slotTime = this.parseBookingDate(this.selectedBooking);
    const now = new Date();
    const diffMs = slotTime.getTime() - now.getTime();
    const diffMins = diffMs / (1000 * 60);

    if (diffMins > 30) {
      return `₹${amount} (Full Refund)`;
    } else {
      const charge = amount * 0.20;
      return `₹${amount - charge} (80% Refund - 20% Fee Applied)`;
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

  openCancel(booking: any): void {
    this.selectedBooking = booking;
    this.cancelReason = '';
    this.showCancelModal = true;
  }

  confirmCancel(): void {
    if (this.selectedBooking) {
      const refund = this.getRefundAmount(this.selectedBooking.amount);
      
      this.bookingService.cancelBooking(this.selectedBooking.id, this.cancelReason).subscribe({
        next: () => {
          this.selectedBooking.status = 'cancelled';
          this.selectedBooking.reason = this.cancelReason || 'Cancelled by Customer';
          this.selectedBooking.refundStatus = refund.includes('Full') ? 'Full Refund' : 'Initiated (80%)';
          this.showCancelModal = false;
          alert(`Booking cancelled. ${refund} has been initiated.`);
        },
        error: () => {
          // Mock success if API fails during demo
          this.selectedBooking.status = 'cancelled';
          this.selectedBooking.reason = this.cancelReason || 'Cancelled by Customer';
          this.selectedBooking.refundStatus = refund.includes('Full') ? 'Full Refund' : 'Initiated (80%)';
          this.showCancelModal = false;
          alert(`Demo Mode: Booking cancelled. ${refund} has been initiated.`);
        }
      });
    }
  }

  openReschedule(booking: any): void {
    this.selectedBooking = booking;
    this.newSlot = booking.time;
    this.showRescheduleModal = true;
  }

  confirmReschedule(): void {
    if (this.selectedBooking && this.newSlot) {
      this.selectedBooking.time = this.newSlot;
      this.showRescheduleModal = false;
      alert('Booking rescheduled successfully!');
    }
  }

  showTermsModal = false;
  showContactModal = false;

  openTerms() { this.showTermsModal = true; }
  openContact() { this.showContactModal = true; }

  openNewBooking(): void {
    this.newBookingForm = {
      turf: 'Green Arena',
      date: new Date().toISOString().split('T')[0],
      time: ''
    };
    this.bookingStep = 'details';
    this.showNewBookingModal = true;
  }

  isSlotBooked(time: string): boolean {
    const slot = this.availableSlots.find(s => s.time === time);
    return slot ? slot.status === 'booked' : true;
  }

  goToPayment(): void {
    // 1. Double check availability before proceeding
    const slot = this.availableSlots.find(s => s.time === this.newBookingForm.time);
    if (!slot || slot.status === 'booked') {
      alert('Error: This slot is no longer available. Please select another time.');
      return;
    }
    this.bookingStep = 'payment';
  }

  confirmNewBooking(): void {
    this.bookingStep = 'processing';
    
    // 2. Initiate Backend Booking
    this.bookingService.initiateBooking('mock_slot_id').subscribe({
      next: (orderData) => {
        // Here we would trigger Razorpay JS Checkout
        // For demo, we simulate a successful payment verification
        setTimeout(() => {
          this.verifyAndComplete();
        }, 1500);
      },
      error: () => {
        // Fallback for Demo
        setTimeout(() => {
          this.verifyAndComplete();
        }, 1500);
      }
    });
  }

  private verifyAndComplete(): void {
    const newB: Booking = {
      id: '#TRF' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      turf: this.newBookingForm.turf,
      date: this.newBookingForm.date,
      time: this.newBookingForm.time,
      amount: '₹1,000',
      status: 'confirmed',
      reason: '',
      refundStatus: ''
    };

    this.myBookings = [newB, ...this.myBookings];
    this.bookingStep = 'success';
    
    setTimeout(() => {
      this.showNewBookingModal = false;
    }, 2000);
  }
}
