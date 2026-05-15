export interface TurfGround {
  id?: string;
  name: string;
  turf_type: string;
  description: string;
  capacity: number;
  pitch_type: string;
  price_per_hour: number;
  weekend_price_per_hour: number;
  images?: string[];
  is_active?: boolean;
  created_at?: string;
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  status: string;
  description: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  google_maps_url?: string;
  logo?: string;
  banner_image?: string;
  primary_color: string;
  secondary_color: string;
  tagline: string;
  amenities: string[];
  turfs: TurfGround[];
}
