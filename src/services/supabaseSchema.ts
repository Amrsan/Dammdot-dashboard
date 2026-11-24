export const SUPABASE_SQL_SCHEMA = `-- ====================================================================
-- HEMOPORTAL: PRODUCTION HEALTHCARE BLOOD ORDERING DATABASE SCHEMA
-- PostgreSQL / Supabase with Row Level Security (RLS) & Seed Catalog
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('customer', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE blood_group AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'A', 'B', 'AB', 'O');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Migration support for existing databases: add ABO groups without +/- (Plasma & Platelets)
DO $$ BEGIN
    ALTER TYPE blood_group ADD VALUE IF NOT EXISTS 'A';
    ALTER TYPE blood_group ADD VALUE IF NOT EXISTS 'B';
    ALTER TYPE blood_group ADD VALUE IF NOT EXISTS 'AB';
    ALTER TYPE blood_group ADD VALUE IF NOT EXISTS 'O';
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE product_availability AS ENUM ('In Stock', 'Limited Stock', 'Out of Stock');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status_enum AS ENUM (
      'Order Received', 'Verification', 'Confirmed', 'Preparing',
      'Out for Delivery', 'Delivered', 'Pending Verification',
      'On Hold', 'Cancelled', 'Rejected'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method_enum AS ENUM ('Cash on Delivery', 'Online Payment');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status_enum AS ENUM ('Pending', 'Paid', 'Failed', 'Refunded', 'Cash on Delivery');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE (Linked with auth.users or guest users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'customer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. PRODUCT TYPES TABLE
CREATE TABLE IF NOT EXISTS public.product_types (
    id TEXT PRIMARY KEY DEFAULT 'pt-' || uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. BLOOD TYPES TABLE
CREATE TABLE IF NOT EXISTS public.blood_types (
    id TEXT PRIMARY KEY DEFAULT 'bt-' || uuid_generate_v4(),
    name blood_group NOT NULL UNIQUE,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. GEOGRAPHY / DELIVERY AREA TABLES
CREATE TABLE IF NOT EXISTS public.governorates (
    id TEXT PRIMARY KEY DEFAULT 'gov-' || uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cities (
    id TEXT PRIMARY KEY DEFAULT 'city-' || uuid_generate_v4(),
    governorate_id TEXT NOT NULL REFERENCES public.governorates(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(governorate_id, name)
);

CREATE TABLE IF NOT EXISTS public.areas (
    id TEXT PRIMARY KEY DEFAULT 'area-' || uuid_generate_v4(),
    city_id TEXT NOT NULL REFERENCES public.cities(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(city_id, name)
);

-- 7. DELIVERY ADDRESSES
CREATE TABLE IF NOT EXISTS public.delivery_addresses (
    id TEXT PRIMARY KEY DEFAULT 'addr-' || uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    governorate_id TEXT NOT NULL REFERENCES public.governorates(id),
    city_id TEXT NOT NULL REFERENCES public.cities(id),
    area_id TEXT NOT NULL REFERENCES public.areas(id),
    address TEXT NOT NULL,
    building TEXT,
    apartment TEXT,
    floor TEXT,
    landmark TEXT,
    phone TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY DEFAULT 'prod-' || uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    blood_type blood_group NOT NULL,
    product_type_id TEXT NOT NULL REFERENCES public.product_types(id) ON DELETE RESTRICT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    availability product_availability NOT NULL DEFAULT 'In Stock',
    image_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. ORDERS TABLE (Includes Paymob References and Clinical Patient Details)
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY DEFAULT 'ord-' || uuid_generate_v4(),
    order_number TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    patient_name TEXT,
    patient_age INT NOT NULL CHECK (patient_age >= 0 AND patient_age <= 130),
    hospital_name TEXT,
    department TEXT,
    blood_type blood_group NOT NULL,
    product_type_id TEXT NOT NULL REFERENCES public.product_types(id),
    product_type_name TEXT NOT NULL,
    product_id TEXT REFERENCES public.products(id),
    product_name TEXT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    delivery_fee NUMERIC(10, 2) NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    payment_method payment_method_enum NOT NULL DEFAULT 'Cash on Delivery',
    payment_status payment_status_enum NOT NULL DEFAULT 'Pending',
    order_status order_status_enum NOT NULL DEFAULT 'Order Received',
    paymob_transaction_id TEXT,
    paymob_order_id TEXT,
    notes TEXT,
    internal_notes TEXT,
    governorate_id TEXT REFERENCES public.governorates(id),
    governorate_name TEXT NOT NULL,
    city_id TEXT REFERENCES public.cities(id),
    city_name TEXT NOT NULL,
    area_id TEXT REFERENCES public.areas(id),
    area_name TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    manual_delivery_address TEXT,
    delivery_building TEXT,
    delivery_apartment TEXT,
    delivery_floor TEXT,
    delivery_landmark TEXT,
    delivery_phone TEXT NOT NULL,
    accuracy_confirmed BOOLEAN NOT NULL DEFAULT true,
    compliance_acknowledged BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. ORDER STATUS HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id TEXT PRIMARY KEY DEFAULT 'hist-' || uuid_generate_v4(),
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    status order_status_enum NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT DEFAULT 'System'
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governorates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policies
DROP POLICY IF EXISTS "Public view profiles" ON public.profiles;
CREATE POLICY "Public view profiles" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR ALL USING (true);

-- Public Catalog Read Policies
DROP POLICY IF EXISTS "Anyone can view product types" ON public.product_types;
CREATE POLICY "Anyone can view product types" ON public.product_types FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can manage product types" ON public.product_types;
CREATE POLICY "Anyone can manage product types" ON public.product_types FOR ALL USING (true);

DROP POLICY IF EXISTS "Anyone can view blood types" ON public.blood_types;
CREATE POLICY "Anyone can view blood types" ON public.blood_types FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can manage blood types" ON public.blood_types;
CREATE POLICY "Anyone can manage blood types" ON public.blood_types FOR ALL USING (true);

DROP POLICY IF EXISTS "Anyone can view governorates" ON public.governorates;
CREATE POLICY "Anyone can view governorates" ON public.governorates FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can view cities" ON public.cities;
CREATE POLICY "Anyone can view cities" ON public.cities FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can view delivery areas" ON public.areas;
CREATE POLICY "Anyone can view delivery areas" ON public.areas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
CREATE POLICY "Anyone can view products" ON public.products FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can manage products" ON public.products;
CREATE POLICY "Anyone can manage products" ON public.products FOR ALL USING (true);

-- Delivery Addresses
DROP POLICY IF EXISTS "Manage delivery addresses" ON public.delivery_addresses;
CREATE POLICY "Manage delivery addresses" ON public.delivery_addresses FOR ALL USING (true);

-- Orders Policies (Permissive so online & guest requisitions function seamlessly)
DROP POLICY IF EXISTS "Anyone can view orders" ON public.orders;
CREATE POLICY "Anyone can view orders" ON public.orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update orders" ON public.orders;
CREATE POLICY "Anyone can update orders" ON public.orders FOR UPDATE USING (true);

-- Order Status History Policies
DROP POLICY IF EXISTS "Anyone can view status history" ON public.order_status_history;
CREATE POLICY "Anyone can view status history" ON public.order_status_history FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert status history" ON public.order_status_history;
CREATE POLICY "Anyone can insert status history" ON public.order_status_history FOR INSERT WITH CHECK (true);

-- ====================================================================
-- Sourcing requests do not change stock.
DROP TRIGGER IF EXISTS trg_order_inventory ON public.orders;

-- ====================================================================
-- SEED DATA INITIALIZATION
-- ====================================================================

-- 1. Product Types
INSERT INTO public.product_types (id, name, description, active) VALUES
('pt-packed-rbc', 'Packed Red Blood', 'Standard concentrated red blood cells (PRBC) for acute blood loss, surgical hemorrhage, and severe anemia.', true),
('pt-filtered', 'Filtered Blood', 'دم مفلتر - Precision micro-filtered red blood cells (<5×10⁶ WBC) preventing febrile transfusion reactions and HLA immunization.', true),
('pt-washed', 'Washed Blood', 'دم مغسول - Saline-washed erythrocytes free of plasma proteins, indicated for patients with prior allergic reactions or IgA deficiency.', true),
('pt-leukoreduced', 'Filtered Blood', 'دم مفلتر - Precision micro-filtered leukoreduced red blood cells.', true),
('pt-irradiated', 'Irradiated Blood', '25-Gy gamma/X-ray irradiated cellular units to prevent Transfusion-Associated Graft-versus-Host Disease (TA-GvHD).', true),
('pt-stack-blood', 'Stack Blood', 'Standard concentrated blood cellular units maintained under strict 2°C–6°C clinical temperature control.', true),
('pt-radiant', 'Radiant', 'Irradiated or specialized pathogen-reduced blood component formulated to prevent graft-versus-host complications.', true),
('pt-plasma', 'Fresh Frozen Plasma', 'بلازما مجمدة حديثة (FFP) - Rich in all physiological coagulation factors and albumin for bleeding disorders.', true),
('pt-platelets', 'Blood Platelets', 'صفائح دموية - Single-donor apheresis and platelet concentrates for thrombocytopenia and acute hemorrhage.', true),
('pt-phlebotomy', 'Therapeutic Phlebotomy', 'فصد علاجي - Controlled therapeutic blood evacuation for Polycythemia Vera and Hemochromatosis under clinical supervision.', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  active = EXCLUDED.active;

-- 2. Blood Types
INSERT INTO public.blood_types (id, name, active) VALUES
('bt-a-pos', 'A+', true),
('bt-a-neg', 'A-', true),
('bt-b-pos', 'B+', true),
('bt-b-neg', 'B-', true),
('bt-ab-pos', 'AB+', true),
('bt-ab-neg', 'AB-', true),
('bt-o-pos', 'O+', true),
('bt-o-neg', 'O-', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Governorates
INSERT INTO public.governorates (id, name, active) VALUES
('gov-cairo', 'Cairo', true),
('gov-giza', 'Giza', true),
('gov-alex', 'Alexandria', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Cities
INSERT INTO public.cities (id, governorate_id, name, active) VALUES
('city-nasr', 'gov-cairo', 'Nasr City', true),
('city-newcairo', 'gov-cairo', 'New Cairo', true),
('city-heliopolis', 'gov-cairo', 'Heliopolis', true),
('city-maadi', 'gov-cairo', 'Maadi', true),
('city-dokki', 'gov-giza', 'Dokki', true),
('city-mohandessin', 'gov-giza', 'Mohandessin', true),
('city-october', 'gov-giza', '6th of October', true),
('city-smouha', 'gov-alex', 'Smouha', true),
('city-miami', 'gov-alex', 'Miami', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Areas & Delivery Tariffs
INSERT INTO public.areas (id, city_id, name, delivery_fee, active) VALUES
('area-nasr-1', 'city-nasr', 'Zone 1 - Nasr City (Main District)', 0.00, true),
('area-newcairo-1', 'city-newcairo', 'Zone 2 - New Cairo (Fifth Settlement)', 0.00, true),
('area-heliopolis-1', 'city-heliopolis', 'Zone 3 - Heliopolis (El Korba)', 0.00, true),
('area-maadi-1', 'city-maadi', 'Zone 4 - Maadi (Degla)', 0.00, true),
('area-dokki-1', 'city-dokki', 'Zone 5 - Dokki (Tahrir St)', 0.00, true),
('area-mohandessin-1', 'city-mohandessin', 'Zone 6 - Mohandessin (Gameat Dowal)', 0.00, true),
('area-october-1', 'city-october', 'Zone 7 - 6th of October (Hosary)', 0.00, true),
('area-smouha-1', 'city-smouha', 'Zone 8 - Smouha (Alexandria Hub)', 0.00, true),
('area-miami-1', 'city-miami', 'Zone 9 - Miami (Corniche Sector)', 0.00, true)
ON CONFLICT (id) DO NOTHING;

-- 6. Products & Ready Inventory (Blood Bags, Plasma, Platelets, Phlebotomy, Filtered & Washed)
INSERT INTO public.products (id, name, description, blood_type, product_type_id, price, stock_quantity, availability, image_url) VALUES
-- Blood Bags (PRBC)
('prod-a-pos', 'Packed Red Blood Cells A+ (PRBC)', 'Standard concentrated red blood cells maintained at 2°C–6°C. High quality tested.', 'A+', 'pt-packed-rbc', 0.00, 18, 'In Stock', 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=600&q=80'),
('prod-a-neg', 'Packed Red Blood Cells A- (PRBC)', 'Rh-negative cellular units suitable for emergent resuscitation and targeted matching.', 'A-', 'pt-packed-rbc', 0.00, 4, 'Limited Stock', 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=600&q=80'),
('prod-b-pos', 'Packed Red Blood Cells B+ (PRBC)', 'Standard B-positive erythrocyte concentrate screened for all major viral markers.', 'B+', 'pt-packed-rbc', 0.00, 12, 'In Stock', 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=600&q=80'),
('prod-b-neg', 'Packed Red Blood Cells B- (PRBC)', 'Rare Rh-negative concentrated blood units preserved with CPDA-1 anticoagulant.', 'B-', 'pt-packed-rbc', 0.00, 3, 'Limited Stock', 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=600&q=80'),
('prod-ab-pos', 'Packed Red Blood Cells AB+ (PRBC)', 'Concentrated erythrocyte product for verified AB Rh-positive clinical recipients.', 'AB+', 'pt-packed-rbc', 0.00, 8, 'In Stock', 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=600&q=80'),
('prod-ab-neg', 'Packed Red Blood Cells AB- (PRBC)', 'Extremely rare cellular units requiring secondary serological cross-match validation.', 'AB-', 'pt-packed-rbc', 0.00, 0, 'Out of Stock', 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=600&q=80'),
('prod-o-pos', 'Packed Red Blood Cells O+ (PRBC)', 'Universal positive emergency donor erythrocytes with high shelf-life stability.', 'O+', 'pt-packed-rbc', 0.00, 25, 'In Stock', 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=600&q=80'),
('prod-o-neg', 'Packed Red Blood Cells O- (Universal Emergency)', 'Universal emergency red blood cells. Crucial for massive transfusion protocol.', 'O-', 'pt-packed-rbc', 0.00, 5, 'Limited Stock', 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=600&q=80'),

-- Fresh Frozen Plasma (FFP)
('prod-o-pos-plasma', 'Fresh Frozen Plasma (O+) - بلازما مجمدة', 'Fresh Frozen Plasma (FFP) preserved at -18°C, rich in all physiological coagulation factors and albumin.', 'O+', 'pt-plasma', 0.00, 20, 'In Stock', 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80'),
('prod-ab-pos-plasma', 'Universal Donor Plasma (AB+) - بلازما عامة', 'Universal recipient/donor compatible plasma unit, optimal for trauma resuscitation without ABO antibodies.', 'AB+', 'pt-plasma', 0.00, 15, 'In Stock', 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80'),
('prod-a-pos-plasma', 'Fresh Frozen Plasma (A+) - بلازما مجمدة', 'Fresh Frozen Plasma (FFP) rich in coagulation factors and albumin for bleeding disorders.', 'A+', 'pt-plasma', 0.00, 18, 'In Stock', 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80'),
('prod-b-pos-plasma', 'Fresh Frozen Plasma (B+) - بلازما مجمدة', 'High-quality therapeutic fresh frozen plasma unit preserved at sub-zero cold chain.', 'B+', 'pt-plasma', 0.00, 12, 'In Stock', 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80'),

-- Therapeutic Phlebotomy (فصد علاجي)
('prod-phlebotomy-standard', 'Therapeutic Phlebotomy Session - فصد علاجي', 'Controlled 450ml therapeutic blood evacuation with vital signs monitoring for Polycythemia Vera and Hemochromatosis under clinical supervision.', 'O+', 'pt-phlebotomy', 0.00, 50, 'In Stock', 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=600&q=80'),
('prod-phlebotomy-a', 'Therapeutic Phlebotomy Session (A+) - فصد علاجي', 'Controlled clinical therapeutic phlebotomy session for hematological management.', 'A+', 'pt-phlebotomy', 0.00, 50, 'In Stock', 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=600&q=80'),

-- Blood Platelets (Thrombocytes / صفائح دموية)
('prod-a-pos-platelets', 'Single-Donor Apheresis Platelets (A+) - صفائح أفيريسيس', 'High-yield single-donor apheresis thrombocytes (>=3.0x10^11) for oncology and massive transfusion protocols.', 'A+', 'pt-platelets', 0.00, 8, 'In Stock', 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=600&q=80'),
('prod-o-pos-platelets', 'Single-Donor Apheresis Platelets (O+) - صفائح أفيريسيس', 'Universal compatible high-count platelets stored under constant 20°C–24°C continuous agitation.', 'O+', 'pt-platelets', 0.00, 6, 'In Stock', 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=600&q=80'),
('prod-b-pos-platelets', 'Single-Donor Apheresis Platelets (B+) - صفائح أفيريسيس', 'Apheresis platelet concentrate for severe thrombocytopenia with verified sterility testing.', 'B+', 'pt-platelets', 0.00, 5, 'In Stock', 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=600&q=80'),
('prod-ab-pos-platelets', 'Single-Donor Apheresis Platelets (AB+) - صفائح أفيريسيس', 'Specialized apheresis thrombocyte unit for designated recipient transfusions.', 'AB+', 'pt-platelets', 0.00, 4, 'In Stock', 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=600&q=80'),

-- Filtered & Washed Blood Bags
('prod-a-pos-filtered', 'Filtered Red Blood Cells (A+) - دم مفلتر', 'دم مفلتر - Micro-filtered leukoreduced red blood cells (<5x10^6 WBC) preventing febrile reactions.', 'A+', 'pt-filtered', 0.00, 18, 'In Stock', 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=600&q=80'),
('prod-o-pos-filtered', 'Filtered Red Blood Cells (O+) - دم مفلتر', 'دم مفلتر - Precision filtered universal recipient unit with reduced leukocyte content.', 'O+', 'pt-filtered', 0.00, 24, 'In Stock', 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=600&q=80'),
('prod-a-pos-washed', 'Washed Red Blood Cells (A+) - دم مغسول', 'دم مغسول - Triple saline-washed erythrocytes free of plasma proteins, preventing allergic reactions.', 'A+', 'pt-washed', 0.00, 14, 'In Stock', 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80'),
('prod-o-pos-washed', 'Washed Red Blood Cells (O+) - دم مغسول', 'دم مغسول - Washed cellular red blood unit in normal saline to minimize allergic risk.', 'O+', 'pt-washed', 0.00, 16, 'In Stock', 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=600&q=80'),
('prod-a-neg-radiant', 'Irradiated Red Cell Unit (A-)', 'Specially treated 25-Gy irradiated red blood bag designed for immunocompromised patients.', 'A-', 'pt-radiant', 0.00, 5, 'Limited Stock', 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80'),
('prod-o-neg-radiant', 'Specialized Radiant RBC (O-)', 'Zero-pathogen irradiated universal unit with ultra-low leukocyte count.', 'O-', 'pt-radiant', 0.00, 2, 'Limited Stock', 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=600&q=80'),

-- Stack Blood Bags
('prod-o-neg-stack', 'Universal Packed RBC Unit (O-)', 'Critical clinical supply of universal donor Packed Red Blood Cells.', 'O-', 'pt-stack-blood', 0.00, 14, 'In Stock', 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=600&q=80'),
('prod-o-pos-stack', 'Packed Red Blood Cells (O+)', 'High-viability packed erythrocytes with CPDA-1 anticoagulant.', 'O+', 'pt-stack-blood', 0.00, 32, 'In Stock', 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80'),
('prod-a-pos-stack', 'Concentrated Erythrocyte Unit (A+)', 'Standard hospital-grade red cell concentrate.', 'A+', 'pt-stack-blood', 0.00, 26, 'In Stock', 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=600&q=80'),
('prod-b-pos-stack', 'Packed Red Blood Cells (B+)', 'Standard clinical erythrocyte unit tested for ABO/Rh confirmation.', 'B+', 'pt-stack-blood', 0.00, 19, 'In Stock', 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=600&q=80'),
('prod-ab-pos-stack', 'Universal Recipient Red Cells (AB+)', 'Quality-certified blood bag, stored in SAGM preservative solution.', 'AB+', 'pt-stack-blood', 0.00, 11, 'In Stock', 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  stock_quantity = EXCLUDED.stock_quantity,
  availability = EXCLUDED.availability,
  image_url = EXCLUDED.image_url;

-- 7. RESILIENT SCHEMA MIGRATIONS (For existing databases)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS manual_delivery_address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS default_address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS building_floor TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS landmark TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS area_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS governorate_name TEXT;
`;
