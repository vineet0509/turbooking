export interface Booking {
  id: string;
  date: string;
  time: string;
  customer?: string;
  turf: string;
  amount: string;
  status: string;
  phone?: string;
  reason?: string;
  cancelReason?: string;
  refundStatus?: string;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name?: string; // Made optional for compatibility
  phone: string;
  role: 'super_admin' | 'turf_owner' | 'customer';
  business_name?: string;
  date_joined?: string;
}
