-- 1. جدول ميزانيات البنود (Project Budgets)
CREATE TABLE IF NOT EXISTS project_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL, -- 'labor' (العمال), 'equipment' (العتاد), 'materials' (المواد), 'other' (أخرى)
  planned_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  actual_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT unique_project_category UNIQUE (project_id, category)
);

-- 2. جدول التكاليف اليومية (Daily Costs)
CREATE TABLE IF NOT EXISTS daily_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  labor_cost DECIMAL(15, 2) NOT NULL DEFAULT 0,
  equipment_cost DECIMAL(15, 2) NOT NULL DEFAULT 0,
  materials_cost DECIMAL(15, 2) NOT NULL DEFAULT 0,
  other_cost DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_cost DECIMAL(15, 2) GENERATED ALWAYS AS (labor_cost + equipment_cost + materials_cost + other_cost) STORED,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT unique_project_date UNIQUE (project_id, date)
);

-- 3. جدول الفواتير (Invoices)
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  invoice_number VARCHAR(100) NOT NULL UNIQUE,
  percentage_complete DECIMAL(5, 2) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'advance' (مقدمة), 'interim' (مرحلية), 'final' (نهائية)
  amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  vat_amount DECIMAL(15, 2) NOT NULL DEFAULT 0, -- ضريبة القيمة المضافة 19%
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'overdue'
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. جدول بنود الفواتير (Invoice Items)
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
  amount DECIMAL(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for the tables if they are using it
ALTER TABLE project_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Add basic policies to allow authenticated users to perform operations
CREATE POLICY "Allow read for authenticated users on project_budgets" ON project_budgets
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert/update/delete for authenticated users on project_budgets" ON project_budgets
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow read for authenticated users on daily_costs" ON daily_costs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert/update/delete for authenticated users on daily_costs" ON daily_costs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow read for authenticated users on invoices" ON invoices
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert/update/delete for authenticated users on invoices" ON invoices
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow read for authenticated users on invoice_items" ON invoice_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert/update/delete for authenticated users on invoice_items" ON invoice_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
