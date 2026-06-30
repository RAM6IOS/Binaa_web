-- ============================================================
-- Migration: Soft Delete للعمال والعتاد
-- إضافة عمود deleted_at للسماح بـ Soft Delete
-- ============================================================

ALTER TABLE workers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE equipment ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- تحديث سياسات RLS لجدول workers لتشمل قراءة deleted_at
DROP POLICY IF EXISTS "workers_select_policy" ON workers;
CREATE POLICY "workers_select_policy"
  ON workers FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "workers_update_policy" ON workers;
CREATE POLICY "workers_update_policy"
  ON workers FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- تحديث سياسات RLS لجدول equipment لتشمل قراءة deleted_at
DROP POLICY IF EXISTS "equipment_select_policy" ON equipment;
CREATE POLICY "equipment_select_policy"
  ON equipment FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "equipment_update_policy" ON equipment;
CREATE POLICY "equipment_update_policy"
  ON equipment FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
