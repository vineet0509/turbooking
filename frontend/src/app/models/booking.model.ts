export interface Booking {
  id: string;
  date: string;
  time: string;
  customer?: string;
  turf: string;
  amount: string;
  status: string;
  phone?: string;
  reason?: string;       // Used for Customer Dashboard display
  cancelReason?: string; // Used for Owner Dashboard display
  refundStatus?: string;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  role: 'turf_owner' | 'customer';
  business_name?: string;
}
