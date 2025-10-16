-- Local Food Marketplace Database Schema
-- 
-- This migration creates a comprehensive database schema for a platform connecting local farmers 
-- with buyers (consumers and restaurants). The system supports farmer profiles, product catalogs, 
-- ordering, messaging, reviews, and inventory management.
--
-- Tables:
-- 1. profiles - User profiles for both farmers and buyers
-- 2. farmer_profiles - Extended profiles for farmers with business information
-- 3. products - Product catalog for farmers
-- 4. orders - Order tracking between buyers and farmers
-- 5. order_items - Individual items in each order
-- 6. reviews - Reviews and ratings for farmers
-- 7. messages - Direct messaging between farmers and buyers
-- 8. favorites - Buyer's favorite farmers
-- 9. order_events - Tracking events for orders
-- 10. notifications - In-app notifications for buyers and farmers

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type text NOT NULL CHECK (user_type IN ('farmer', 'buyer')),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Farmer profiles table
CREATE TABLE IF NOT EXISTS farmer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  farm_name text NOT NULL,
  description text,
  farm_size text,
  farming_practices text[] DEFAULT '{}',
  address text,
  latitude numeric,
  longitude numeric,
  delivery_radius_km integer DEFAULT 0,
  pickup_available boolean DEFAULT true,
  delivery_available boolean DEFAULT false,
  business_hours jsonb DEFAULT '{}',
  certifications text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL REFERENCES farmer_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  price_per_unit numeric NOT NULL CHECK (price_per_unit >= 0),
  unit text NOT NULL,
  available_quantity numeric DEFAULT 0 CHECK (available_quantity >= 0),
  min_order_quantity numeric DEFAULT 1 CHECK (min_order_quantity >= 0),
  image_url text,
  is_available boolean DEFAULT true,
  seasonal_availability text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  farmer_id uuid NOT NULL REFERENCES farmer_profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'ready', 'completed', 'cancelled')),
  total_amount numeric DEFAULT 0 CHECK (total_amount >= 0),
  delivery_method text CHECK (delivery_method IN ('pickup', 'delivery')),
  delivery_address text,
  delivery_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity numeric NOT NULL CHECK (quantity > 0),
  price_per_unit numeric NOT NULL CHECK (price_per_unit >= 0),
  subtotal numeric NOT NULL CHECK (subtotal >= 0)
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL REFERENCES farmer_profiles(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(buyer_id, order_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  farmer_id uuid NOT NULL REFERENCES farmer_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(buyer_id, farmer_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_farmer_profiles_location ON farmer_profiles(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_products_farmer ON products(farmer_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_available ON products(is_available);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_farmer ON orders(farmer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_farmer ON reviews(farmer_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
-- New: order_events RLS will be enabled after table creation below
-- New: notifications RLS will be enabled after table creation below

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Farmer profiles policies
CREATE POLICY "Anyone can view farmer profiles"
  ON farmer_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Farmers can insert their own profile"
  ON farmer_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'farmer'
      AND profiles.id = farmer_profiles.user_id
    )
  );

CREATE POLICY "Farmers can update their own profile"
  ON farmer_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.id = user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.id = user_id
    )
  );

-- Products policies
CREATE POLICY "Anyone can view available products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Farmers can insert their own products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM farmer_profiles
      WHERE farmer_profiles.id = products.farmer_id
      AND farmer_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Farmers can update their own products"
  ON products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM farmer_profiles
      WHERE farmer_profiles.id = products.farmer_id
      AND farmer_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM farmer_profiles
      WHERE farmer_profiles.id = products.farmer_id
      AND farmer_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Farmers can delete their own products"
  ON products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM farmer_profiles
      WHERE farmer_profiles.id = products.farmer_id
      AND farmer_profiles.user_id = auth.uid()
    )
  );

-- Orders policies
CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    auth.uid() = buyer_id OR
    EXISTS (
      SELECT 1 FROM farmer_profiles
      WHERE farmer_profiles.id = orders.farmer_id
      AND farmer_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Buyers can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Users can update their relevant orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = buyer_id OR
    EXISTS (
      SELECT 1 FROM farmer_profiles
      WHERE farmer_profiles.id = orders.farmer_id
      AND farmer_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = buyer_id OR
    EXISTS (
      SELECT 1 FROM farmer_profiles
      WHERE farmer_profiles.id = orders.farmer_id
      AND farmer_profiles.user_id = auth.uid()
    )
  );

-- Order items policies
CREATE POLICY "Users can view order items for their orders"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (
        orders.buyer_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM farmer_profiles
          WHERE farmer_profiles.id = orders.farmer_id
          AND farmer_profiles.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Buyers can insert order items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.buyer_id = auth.uid()
    )
  );

-- Reviews policies
CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Buyers can create reviews for their orders"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = buyer_id AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = reviews.order_id
      AND orders.buyer_id = auth.uid()
      AND orders.status = 'completed'
    )
  );

CREATE POLICY "Buyers can update their own reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

-- Messages policies
CREATE POLICY "Users can view their own messages"
  ON messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can update message read status"
  ON messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- Favorites policies
CREATE POLICY "Users can view their own favorites"
  ON favorites FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id);

CREATE POLICY "Buyers can add favorites"
  ON favorites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Buyers can remove favorites"
  ON favorites FOR DELETE
  TO authenticated
  USING (auth.uid() = buyer_id);

-- Order events table (tracking)
CREATE TABLE IF NOT EXISTS order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('status_change','note','location_update')),
  status text CHECK (status IN ('pending','confirmed','ready','completed','cancelled')),
  note text,
  location jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;

-- Order events policies
CREATE POLICY "Users can view events for their orders"
  ON order_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_events.order_id
      AND (
        orders.buyer_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM farmer_profiles
          WHERE farmer_profiles.id = orders.farmer_id
          AND farmer_profiles.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can insert events on their orders"
  ON order_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_events.order_id
      AND (
        orders.buyer_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM farmer_profiles
          WHERE farmer_profiles.id = orders.farmer_id
          AND farmer_profiles.user_id = auth.uid()
        )
      )
    )
  );

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('order_created','order_status_changed','favorited')),
  title text NOT NULL,
  message text,
  meta jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view their notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "System inserts notifications for valid recipients"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (recipient_id IS NOT NULL);