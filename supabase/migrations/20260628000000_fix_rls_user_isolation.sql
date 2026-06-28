-- ============================================================
-- Migration: إصلاح عزل البيانات بين المستخدمين (RLS Fix)
-- المشكلة: كل مستخدم مصادق يرى بيانات جميع المستخدمين
-- الحل: ربط كل سجل بـ user_id وتحديث سياسات RLS
-- ============================================================

-- ============================
-- 1. جدول equipment: إضافة user_id
-- ============================
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- تفعيل RLS
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Allow read for authenticated users on equipment" ON equipment;
DROP POLICY IF EXISTS "Allow all for authenticated users on equipment" ON equipment;
DROP POLICY IF EXISTS "equipment_select_policy" ON equipment;
DROP POLICY IF EXISTS "equipment_insert_policy" ON equipment;
DROP POLICY IF EXISTS "equipment_update_policy" ON equipment;
DROP POLICY IF EXISTS "equipment_delete_policy" ON equipment;

-- إنشاء سياسات جديدة تعزل البيانات حسب المستخدم
CREATE POLICY "equipment_select_policy"
  ON equipment FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "equipment_insert_policy"
  ON equipment FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "equipment_update_policy"
  ON equipment FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "equipment_delete_policy"
  ON equipment FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================
-- 2. جدول projects: تحديث RLS
-- ============================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read for authenticated users on projects" ON projects;
DROP POLICY IF EXISTS "Allow all for authenticated users on projects" ON projects;
DROP POLICY IF EXISTS "projects_select_policy" ON projects;
DROP POLICY IF EXISTS "projects_insert_policy" ON projects;
DROP POLICY IF EXISTS "projects_update_policy" ON projects;
DROP POLICY IF EXISTS "projects_delete_policy" ON projects;

CREATE POLICY "projects_select_policy"
  ON projects FOR SELECT TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "projects_insert_policy"
  ON projects FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "projects_update_policy"
  ON projects FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "projects_delete_policy"
  ON projects FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- ============================
-- 3. جدول workers: تحديث RLS
-- ============================
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read for authenticated users on workers" ON workers;
DROP POLICY IF EXISTS "Allow all for authenticated users on workers" ON workers;
DROP POLICY IF EXISTS "workers_select_policy" ON workers;
DROP POLICY IF EXISTS "workers_insert_policy" ON workers;
DROP POLICY IF EXISTS "workers_update_policy" ON workers;
DROP POLICY IF EXISTS "workers_delete_policy" ON workers;

CREATE POLICY "workers_select_policy"
  ON workers FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "workers_insert_policy"
  ON workers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "workers_update_policy"
  ON workers FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "workers_delete_policy"
  ON workers FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================
-- 4. project_budgets: عزل عبر project_id
-- ============================
DROP POLICY IF EXISTS "Allow read for authenticated users on project_budgets" ON project_budgets;
DROP POLICY IF EXISTS "Allow insert/update/delete for authenticated users on project_budgets" ON project_budgets;

CREATE POLICY "project_budgets_select_policy"
  ON project_budgets FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_budgets.project_id
        AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "project_budgets_insert_policy"
  ON project_budgets FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_budgets.project_id
        AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "project_budgets_update_policy"
  ON project_budgets FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_budgets.project_id
        AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "project_budgets_delete_policy"
  ON project_budgets FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_budgets.project_id
        AND projects.created_by = auth.uid()
    )
  );

-- ============================
-- 5. daily_costs
-- ============================
DROP POLICY IF EXISTS "Allow read for authenticated users on daily_costs" ON daily_costs;
DROP POLICY IF EXISTS "Allow insert/update/delete for authenticated users on daily_costs" ON daily_costs;

CREATE POLICY "daily_costs_select_policy"
  ON daily_costs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = daily_costs.project_id
        AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "daily_costs_insert_policy"
  ON daily_costs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = daily_costs.project_id
        AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "daily_costs_update_policy"
  ON daily_costs FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = daily_costs.project_id
        AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "daily_costs_delete_policy"
  ON daily_costs FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = daily_costs.project_id
        AND projects.created_by = auth.uid()
    )
  );

-- ============================
-- 6. invoices
-- ============================
DROP POLICY IF EXISTS "Allow read for authenticated users on invoices" ON invoices;
DROP POLICY IF EXISTS "Allow insert/update/delete for authenticated users on invoices" ON invoices;

CREATE POLICY "invoices_select_policy"
  ON invoices FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = invoices.project_id
        AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "invoices_insert_policy"
  ON invoices FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = invoices.project_id
        AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "invoices_update_policy"
  ON invoices FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = invoices.project_id
        AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "invoices_delete_policy"
  ON invoices FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = invoices.project_id
        AND projects.created_by = auth.uid()
    )
  );

-- ============================
-- 7. invoice_items
-- ============================
DROP POLICY IF EXISTS "Allow read for authenticated users on invoice_items" ON invoice_items;
DROP POLICY IF EXISTS "Allow insert/update/delete for authenticated users on invoice_items" ON invoice_items;

CREATE POLICY "invoice_items_select_policy"
  ON invoice_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      JOIN projects ON projects.id = invoices.project_id
      WHERE invoices.id = invoice_items.invoice_id
        AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "invoice_items_insert_policy"
  ON invoice_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      JOIN projects ON projects.id = invoices.project_id
      WHERE invoices.id = invoice_items.invoice_id
        AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "invoice_items_update_policy"
  ON invoice_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      JOIN projects ON projects.id = invoices.project_id
      WHERE invoices.id = invoice_items.invoice_id
        AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "invoice_items_delete_policy"
  ON invoice_items FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      JOIN projects ON projects.id = invoices.project_id
      WHERE invoices.id = invoice_items.invoice_id
        AND projects.created_by = auth.uid()
    )
  );

-- ============================
-- 8. daily_pointage
-- ============================
DROP POLICY IF EXISTS "Allow select pointages for authenticated" ON daily_pointage;
DROP POLICY IF EXISTS "Allow insert pointages for authenticated" ON daily_pointage;
DROP POLICY IF EXISTS "Allow update pointages for authenticated" ON daily_pointage;
DROP POLICY IF EXISTS "Allow delete pointages for authenticated" ON daily_pointage;

CREATE POLICY "daily_pointage_select_policy"
  ON daily_pointage FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = daily_pointage.project_id
        AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "daily_pointage_insert_policy"
  ON daily_pointage FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = daily_pointage.project_id
        AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "daily_pointage_update_policy"
  ON daily_pointage FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = daily_pointage.project_id
        AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "daily_pointage_delete_policy"
  ON daily_pointage FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = daily_pointage.project_id
        AND projects.created_by = auth.uid()
    )
  );


