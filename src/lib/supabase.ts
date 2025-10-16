import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserType = 'farmer' | 'buyer';

export interface Profile {
  id: string;
  user_type: UserType;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface FarmerProfile {
  id: string;
  user_id: string;
  farm_name: string;
  description?: string;
  farm_size?: string;
  farming_practices: string[];
  address?: string;
  latitude?: number;
  longitude?: number;
  delivery_radius_km: number;
  pickup_available: boolean;
  delivery_available: boolean;
  business_hours: Record<string, any>;
  certifications: string[];
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  farmer_id: string;
  name: string;
  description?: string;
  category: string;
  price_per_unit: number;
  unit: string;
  available_quantity: number;
  min_order_quantity: number;
  image_url?: string;
  is_available: boolean;
  seasonal_availability: string[];
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  buyer_id: string;
  farmer_id: string;
  status: 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled';
  total_amount: number;
  delivery_method: 'pickup' | 'delivery';
  delivery_address?: string;
  delivery_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price_per_unit: number;
  subtotal: number;
}

export interface Review {
  id: string;
  farmer_id: string;
  buyer_id: string;
  order_id?: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export type OrderEventType = 'status_change' | 'note' | 'location_update';

export interface OrderEvent {
  id: string;
  order_id: string;
  actor_id: string;
  event_type: OrderEventType;
  status?: Order['status'];
  note?: string;
  location?: Record<string, any>;
  created_at: string;
}

export type NotificationType = 'order_created' | 'order_status_changed' | 'favorited';

export interface Notification {
  id: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  message?: string;
  meta?: Record<string, any>;
  is_read: boolean;
  created_at: string;
}
