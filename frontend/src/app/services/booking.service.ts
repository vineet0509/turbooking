import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Booking } from '../models/booking.model';
import { AuthService } from './auth.service';

const API_BASE = 'http://localhost:8000/api/bookings';

@Injectable({ providedIn: 'root' })
export class BookingService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  // Fetch my bookings from backend
  getMyBookings(): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${API_BASE}/my/`, { headers: this.auth.authHeaders });
  }

  // Create a pending booking + Razorpay order
  initiateBooking(slotId: string): Observable<any> {
    return this.http.post(`${API_BASE}/create/`, { slot_id: slotId }, { headers: this.auth.authHeaders });
  }

  // Verify payment and confirm booking
  verifyPayment(payload: any): Observable<any> {
    return this.http.post(`${API_BASE}/verify/`, payload, { headers: this.auth.authHeaders });
  }

  // Fetch all customers for this tenant
  getCustomers(): Observable<any[]> {
    return this.http.get<any[]>(`${API_BASE}/customers/`, { headers: this.auth.authHeaders });
  }

  // Fetch all payments for this tenant
  getPayments(): Observable<any[]> {
    return this.http.get<any[]>(`${API_BASE}/payments/`, { headers: this.auth.authHeaders });
  }

  // Cancel booking
  cancelBooking(bookingId: string, reason: string): Observable<any> {
    return this.http.post(`${API_BASE}/${bookingId}/cancel/`, { reason }, { headers: this.auth.authHeaders });
  }
}
