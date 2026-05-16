import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { BookingService } from '../services/booking.service';
import { Booking, User } from '../models/booking.model';

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
  selectedBooking: Booking | null = null;
  cancelReason: string = '';
  
  // Real-time Slot Availability Mock
  availableSlots = [
    { id: 'S1', time: '06:00 PM', status: 'available' },
    { id: 'S2', time: '07:00 PM', status: 'available' },
    { id: 'S3', time: '08:00 PM', status: 'booked' },
    { id: 'S4', time: '09:00 PM', status: 'available' },
    { id: 'S5', time: '10:00 PM', status: 'available' },
    { id: 'S6', time: '11:00 PM', status: 'available' }
  ];
  
  newSlot: string = '';

  showNewBookingModal = false;
  bookingStep: 'details' | 'payment' | 'processing' | 'success' = 'details';
  
  newBookingForm = {
    turf: 'Green Arena',
    date: new Date().toISOString().split('T')[0],
    time: ''
  };

  myPasses: any[] = [];
  showPassesModal = false;
  paymentMethod: 'online' | 'pass' = 'online';
  activePass: any = null;

  constructor(
    private auth: AuthService, 
    private bookingService: BookingService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.user = this.auth.currentUser as User;
    this.loadBookings();
    
    this.auth.fetchProfile().subscribe({
      next: user => this.user = user as User,
      error: () => this.logout()
    });
    this.loadPasses();
  }

  loadPasses(): void {
    this.bookingService.getPasses().subscribe(res => {
      this.myPasses = res;
    });
  }

  openPassesModal() {
    this.showPassesModal = true;
    this.loadPasses();
  }

  loadBookings(): void {
    this.isLoading = true;
    this.bookingService.getBookings().subscribe({
      next: (data) => {
        this.myBookings = data;
        this.isLoading = false;
      },
      error: () => {
        // Fallback to mock
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

  getRefundAmount(amountStr: string | undefined): string {
    if (!amountStr || !this.selectedBooking) return '₹0';
    const amount = parseInt(amountStr.replace('₹', '').replace(',', ''));
    
    const slotTime = this.parseBookingDate(this.selectedBooking);
    const now = new Date();
    const diffMins = (slotTime.getTime() - now.getTime()) / (1000 * 60);

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

  openCancel(booking: Booking): void {
    this.selectedBooking = booking;
    this.cancelReason = '';
    this.showCancelModal = true;
  }

  confirmCancel(): void {
    if (this.selectedBooking) {
      const refund = this.getRefundAmount(this.selectedBooking.amount);
      
      this.bookingService.cancelBooking(this.selectedBooking.id, this.cancelReason).subscribe({
        next: () => {
          if (this.selectedBooking) {
            this.selectedBooking.status = 'cancelled';
            this.selectedBooking.reason = this.cancelReason || 'Cancelled by Customer';
            this.selectedBooking.refundStatus = refund.includes('Full') ? 'Full Refund' : 'Initiated (80%)';
          }
          this.showCancelModal = false;
        },
        error: () => {
          if (this.selectedBooking) {
            this.selectedBooking.status = 'cancelled';
            this.selectedBooking.reason = this.cancelReason || 'Cancelled by Customer';
            this.selectedBooking.refundStatus = refund.includes('Full') ? 'Full Refund' : 'Initiated (80%)';
          }
          this.showCancelModal = false;
        }
      });
    }
  }

  openReschedule(booking: Booking): void {
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
  showAboutModal = false;
  showContactModal = false;

  openTerms() { this.showTermsModal = true; }
  openAbout() { this.showAboutModal = true; }
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
    const slot = this.availableSlots.find(s => s.time === this.newBookingForm.time);
    if (!slot) {
      alert('Error: Please select a time slot.');
      return;
    }
    // Check for active pass for this arena
    this.activePass = this.myPasses.find(p => p.tenant === this.newBookingForm.turf && p.is_active);
    this.paymentMethod = this.activePass ? 'pass' : 'online';
    this.bookingStep = 'payment';
  }

  confirmNewBooking(): void {
    const selectedSlot = this.availableSlots.find(s => s.time === this.newBookingForm.time);
    if (!selectedSlot) return;

    this.bookingStep = 'processing';
    
    this.bookingService.initiateBooking(selectedSlot.id, this.paymentMethod === 'pass').subscribe({
      next: (res: any) => {
        if (this.paymentMethod === 'pass' || res.status === 'confirmed') {
          this.verifyAndComplete();
        } else if (res.status === 'pending_payment') {
          const options = {
            key: res.key_id,
            amount: res.amount * 100,
            currency: 'INR',
            name: 'TurfBook',
            description: 'Turf Booking Payment',
            order_id: res.razorpay_order_id,
            handler: (response: any) => {
              this.bookingService.verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              }).subscribe({
                next: () => this.verifyAndComplete(),
                error: (err: any) => {
                  alert('Payment verification failed');
                  this.bookingStep = 'payment';
                }
              });
            },
            prefill: {
              name: this.user?.first_name + ' ' + this.user?.last_name,
              email: this.user?.email,
              contact: this.user?.phone
            },
            theme: { color: '#10b981' },
            modal: {
              ondismiss: () => {
                this.bookingStep = 'payment';
              }
            }
          };
          const rzp = new (window as any).Razorpay(options);
          rzp.open();
        }
      },
      error: (err: any) => {
        alert(err.error?.error || 'Failed to initiate booking');
        this.bookingStep = 'payment';
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
    setTimeout(() => { this.showNewBookingModal = false; }, 2000);
  }
}
