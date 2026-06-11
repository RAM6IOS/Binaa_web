-- ============================================================
-- Migration: إصلاح جدول daily_logs كاملاً
-- الخطوة 1: تشغيل هذا الـ SQL في Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. إضافة الأعمدة الجديدة
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS problems_faced TEXT;
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS workers_present JSONB DEFAULT '[]'::jsonb;
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS equipment_used JSONB DEFAULT '[]'::jsonb;
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;

-- 2. تأكد من تفعيل RLS
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

-- 3. حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS "Allow read daily_logs for authenticated"   ON daily_logs;
DROP POLICY IF EXISTS "Allow all on daily_logs for authenticated" ON daily_logs;
DROP POLICY IF EXISTS "Allow insert daily_logs for authenticated" ON daily_logs;
DROP POLICY IF EXISTS "Allow update daily_logs for authenticated" ON daily_logs;
DROP POLICY IF EXISTS "Allow delete daily_logs for authenticated" ON daily_logs;

-- 4. إنشاء سياسات منفصلة لكل عملية (أكثر أماناً من ALL)
CREATE POLICY "Allow select daily_logs for authenticated"
  ON daily_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert daily_logs for authenticated"
  ON daily_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update daily_logs for authenticated"
  ON daily_logs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete daily_logs for authenticated"
  ON daily_logs FOR DELETE
  TO authenticated
  USING (true);

-- 5. فهرس للأداء
CREATE INDEX IF NOT EXISTS idx_daily_logs_project_date
  ON daily_logs(project_id, log_date DESC);
