-- ═══════════════════════════════════════════════════════════════════
-- وحدة Bon de Commande (أمر الطلب / طلب الشراء) — Binaa
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- 1) جدول رأس أوامر الطلب (purchase_orders)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id                      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id              uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  number                  text NOT NULL,
  order_date              date NOT NULL DEFAULT CURRENT_DATE,
  supplier_name           text NOT NULL,
  supplier_phone          text,
  supplier_address        text,
  expected_delivery_date  date,
  status                  text NOT NULL DEFAULT 'draft',
  notes                   text,
  total_ht                numeric NOT NULL DEFAULT 0,
  tva_rate                numeric DEFAULT 19,
  total_tva               numeric DEFAULT 0,
  total_ttc               numeric DEFAULT 0,
  created_by              uuid REFERENCES auth.users(id),
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now(),

  CONSTRAINT purchase_orders_project_number_unique UNIQUE (project_id, number),
  CONSTRAINT purchase_orders_status_check CHECK (status IN ('draft','sent','partial','received','cancelled'))
);

COMMENT ON TABLE public.purchase_orders IS 'أوامر الطلب / Bons de commande — طلب مواد أو خدمات من مورّد لصالح ورشة';

CREATE INDEX IF NOT EXISTS idx_purchase_orders_project_id ON public.purchase_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status     ON public.purchase_orders(status);

-- ─────────────────────────────────────────────
-- 2) جدول بنود أمر الطلب (purchase_order_items)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id   uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  project_id          uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  material_id         uuid REFERENCES public.materials(id) ON DELETE SET NULL,
  designation         text NOT NULL,
  unit                text NOT NULL,
  quantity            numeric NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit_price_ht       numeric NOT NULL DEFAULT 0 CHECK (unit_price_ht >= 0),
  amount_ht           numeric NOT NULL DEFAULT 0,
  notes               text,
  sort_order          int DEFAULT 0,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

COMMENT ON TABLE public.purchase_order_items IS 'بنود أمر الطلب — سطر طلب مادة/خدمة مع الكمية والسعر';

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order_id   ON public.purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_project_id ON public.purchase_order_items(project_id);

-- ─────────────────────────────────────────────
-- 3) RLS — نفس فلسفة باقي المشروع (المستخدم يصل لمشاريعه فقط)
-- ─────────────────────────────────────────────
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- ── purchase_orders ──
DROP POLICY IF EXISTS "Users view own project purchase_orders" ON public.purchase_orders;
CREATE POLICY "Users view own project purchase_orders"
  ON public.purchase_orders FOR SELECT
  USING (project_id IN (SELECT id FROM public.projects WHERE created_by = auth.uid()));

DROP POLICY IF EXISTS "Users insert purchase_orders for own projects" ON public.purchase_orders;
CREATE POLICY "Users insert purchase_orders for own projects"
  ON public.purchase_orders FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE created_by = auth.uid()));

DROP POLICY IF EXISTS "Users update own project purchase_orders" ON public.purchase_orders;
CREATE POLICY "Users update own project purchase_orders"
  ON public.purchase_orders FOR UPDATE
  USING (project_id IN (SELECT id FROM public.projects WHERE created_by = auth.uid()));

DROP POLICY IF EXISTS "Users delete own project purchase_orders" ON public.purchase_orders;
CREATE POLICY "Users delete own project purchase_orders"
  ON public.purchase_orders FOR DELETE
  USING (project_id IN (SELECT id FROM public.projects WHERE created_by = auth.uid()));

-- ── purchase_order_items ──
DROP POLICY IF EXISTS "Users view own project purchase_order_items" ON public.purchase_order_items;
CREATE POLICY "Users view own project purchase_order_items"
  ON public.purchase_order_items FOR SELECT
  USING (project_id IN (SELECT id FROM public.projects WHERE created_by = auth.uid()));

DROP POLICY IF EXISTS "Users insert purchase_order_items for own projects" ON public.purchase_order_items;
CREATE POLICY "Users insert purchase_order_items for own projects"
  ON public.purchase_order_items FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE created_by = auth.uid()));

DROP POLICY IF EXISTS "Users update own project purchase_order_items" ON public.purchase_order_items;
CREATE POLICY "Users update own project purchase_order_items"
  ON public.purchase_order_items FOR UPDATE
  USING (project_id IN (SELECT id FROM public.projects WHERE created_by = auth.uid()));

DROP POLICY IF EXISTS "Users delete own project purchase_order_items" ON public.purchase_order_items;
CREATE POLICY "Users delete own project purchase_order_items"
  ON public.purchase_order_items FOR DELETE
  USING (project_id IN (SELECT id FROM public.projects WHERE created_by = auth.uid()));

-- ─────────────────────────────────────────────
-- 4) Trigger لتحديث updated_at تلقائياً
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_purchase_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_purchase_orders_updated_at ON public.purchase_orders;
CREATE TRIGGER set_purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_purchase_orders_updated_at();

DROP TRIGGER IF EXISTS set_purchase_order_items_updated_at ON public.purchase_order_items;
CREATE TRIGGER set_purchase_order_items_updated_at
  BEFORE UPDATE ON public.purchase_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_purchase_orders_updated_at();
