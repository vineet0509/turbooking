export interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  price_monthly: number;
  price_yearly: number;
  max_turfs: number;
  max_bookings_per_month: number;
  features: string[];
}

export interface TenantSubscription {
  plan: string;
  billing_cycle: string;
  status: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  max_turfs: number;
  features: string[];
}
