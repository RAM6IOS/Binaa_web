-- 1. توسيع جدول المعدات (equipment) لدعم وضع التأجير
ALTER TABLE equipment
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_for_rent BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS rent_hourly_rate DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS rent_daily_rate DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS gps_coordinates VARCHAR(100),
  ADD COLUMN IF NOT EXISTS description TEXT;

-- تحديث السجلات الحالية بمالك افتراضي إذا كانت قاعدة البيانات تحتوي على سجلات
-- يمكن للمستخدمين تغييرها لاحقاً
-- UPDATE equipment SET owner_id = (SELECT id FROM auth.users LIMIT 1) WHERE owner_id IS NULL;

-- 2. إنشاء جدول طلبات واستئجار المعدات (equipment_rentals)
CREATE TABLE IF NOT EXISTS equipment_rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  renter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_cost DECIMAL(15, 2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'ongoing', 'completed', 'rejected'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT valid_rental_dates CHECK (start_date <= end_date)
);

-- 3. إنشاء جدول فترات عدم التوفر أو التوافر الزمني (equipment_availability)
CREATE TABLE IF NOT EXISTS equipment_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_available BOOLEAN DEFAULT FALSE NOT NULL, -- FALSE تعني محجوزة أو غير متاحة للمالك
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT valid_availability_dates CHECK (start_date <= end_date)
);

-- 4. تفعيل حماية Row Level Security (RLS)
ALTER TABLE equipment_rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_availability ENABLE ROW LEVEL SECURITY;

-- 5. إنشاء سياسات الوصول (Policies)

-- سياسات لجدول equipment_rentals
CREATE POLICY "Allow read rentals for involved users" ON equipment_rentals
  FOR SELECT TO authenticated
  USING (auth.uid() = renter_id OR auth.uid() = owner_id);

CREATE POLICY "Allow insert rental for authenticated users" ON equipment_rentals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = renter_id);

CREATE POLICY "Allow update rental for involved users" ON equipment_rentals
  FOR UPDATE TO authenticated
  USING (auth.uid() = renter_id OR auth.uid() = owner_id)
  WITH CHECK (auth.uid() = renter_id OR auth.uid() = owner_id);

-- سياسات لجدول equipment_availability
CREATE POLICY "Allow read availability for everyone" ON equipment_availability
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow write availability for equipment owners" ON equipment_availability
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM equipment 
      WHERE equipment.id = equipment_availability.equipment_id 
      AND equipment.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM equipment 
      WHERE equipment.id = equipment_availability.equipment_id 
      AND equipment.owner_id = auth.uid()
    )
  );
