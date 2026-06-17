-- ============================================================
-- Migration: إنشاء نظام تسجيل الحضور والغياب (Pointage)
-- تشغيل هذا الملف في Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. جدول تسجيل الحضور الرئيسي (daily_pointage)
CREATE TABLE IF NOT EXISTS daily_pointage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  pointage_date DATE NOT NULL,
  notes TEXT,
  equipment_used JSONB DEFAULT '[]'::jsonb,
  photos JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT unique_project_pointage_date UNIQUE (project_id, pointage_date)
);

-- 2. تفاصيل حضور عمال المشروع (daily_pointage_workers)
CREATE TABLE IF NOT EXISTS daily_pointage_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pointage_id UUID REFERENCES daily_pointage(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'present', -- 'present', 'absent', 'half_day', 'overtime'
  check_in_time TIME,
  check_out_time TIME,
  break_duration_minutes INTEGER DEFAULT 0,
  hours_worked DECIMAL(5, 2) NOT NULL DEFAULT 8.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT unique_pointage_worker UNIQUE (pointage_id, worker_id)
);

-- 3. تفعيل RLS
ALTER TABLE daily_pointage ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_pointage_workers ENABLE ROW LEVEL SECURITY;

-- 4. حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS "Allow select pointages for authenticated" ON daily_pointage;
DROP POLICY IF EXISTS "Allow insert pointages for authenticated" ON daily_pointage;
DROP POLICY IF EXISTS "Allow update pointages for authenticated" ON daily_pointage;
DROP POLICY IF EXISTS "Allow delete pointages for authenticated" ON daily_pointage;

DROP POLICY IF EXISTS "Allow select pointage_workers for authenticated" ON daily_pointage_workers;
DROP POLICY IF EXISTS "Allow insert pointage_workers for authenticated" ON daily_pointage_workers;
DROP POLICY IF EXISTS "Allow update pointage_workers for authenticated" ON daily_pointage_workers;
DROP POLICY IF EXISTS "Allow delete pointage_workers for authenticated" ON daily_pointage_workers;

-- 5. إنشاء سياسات الوصول لـ daily_pointage
CREATE POLICY "Allow select pointages for authenticated"
  ON daily_pointage FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert pointages for authenticated"
  ON daily_pointage FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow update pointages for authenticated"
  ON daily_pointage FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete pointages for authenticated"
  ON daily_pointage FOR DELETE TO authenticated USING (true);

-- 6. إنشاء سياسات الوصول لـ daily_pointage_workers
CREATE POLICY "Allow select pointage_workers for authenticated"
  ON daily_pointage_workers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert pointage_workers for authenticated"
  ON daily_pointage_workers FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow update pointage_workers for authenticated"
  ON daily_pointage_workers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete pointage_workers for authenticated"
  ON daily_pointage_workers FOR DELETE TO authenticated USING (true);

-- 7. فهارس الأداء
CREATE INDEX IF NOT EXISTS idx_daily_pointage_project_date ON daily_pointage(project_id, pointage_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_pointage_workers_pointage ON daily_pointage_workers(pointage_id);
CREATE INDEX IF NOT EXISTS idx_daily_pointage_workers_worker ON daily_pointage_workers(worker_id);
