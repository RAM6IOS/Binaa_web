-- 1. التأكد من وجود الأعمدة المطلوبة لعملية التأجير في جدول equipment
ALTER TABLE equipment
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_for_rent BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS rent_daily_rate DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS rent_hourly_rate DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS rental_description TEXT,
  ADD COLUMN IF NOT EXISTS gps_coordinates VARCHAR(100);

-- 2. تفعيل Row Level Security (RLS) على جدول equipment
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

-- 3. إنشاء سياسات الوصول (RLS Policies) لجدول equipment

-- سياسة القراءة: السماح لجميع المستخدمين المسجلين بقراءة المعدات
DROP POLICY IF EXISTS "Allow select for all authenticated users" ON equipment;
CREATE POLICY "Allow select for all authenticated users" ON equipment
  FOR SELECT TO authenticated
  USING (true);

-- سياسة الإضافة: السماح للمستخدمين المسجلين بإضافة معدات جديدة مع ربطها بأنفسهم كمالكين
DROP POLICY IF EXISTS "Allow insert for owner" ON equipment;
CREATE POLICY "Allow insert for owner" ON equipment
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- سياسة التعديل: السماح لمالك المعدة فقط بتعديل بياناتها
DROP POLICY IF EXISTS "Allow update for owner" ON equipment;
CREATE POLICY "Allow update for owner" ON equipment
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- سياسة الحذف: السماح لمالك المعدة فقط بحذفها
DROP POLICY IF EXISTS "Allow delete for owner" ON equipment;
CREATE POLICY "Allow delete for owner" ON equipment
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);
