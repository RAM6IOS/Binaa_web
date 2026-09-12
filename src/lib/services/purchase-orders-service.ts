import { createClient } from '../supabase/client';
import { assertPermission } from './guard';
import {
  PurchaseOrder, PurchaseOrderItem, PurchaseOrderWithItems,
  CreatePurchaseOrderInput, UpdatePurchaseOrderInput, CreatePurchaseOrderItemInput,
  canChangeStatus, LOCKED_STATUSES,
} from '../types/purchase-orders';
import type { PostgrestError } from '@supabase/supabase-js';

const supabase = createClient();

// ── أدوات مساعدة ──

function logError(context: string, error: PostgrestError | Error) {
  console.error(`[PurchaseOrders] ${context}:`, error.message);
}

/** البنود لا تعدَّل إلا في حالة المسودة (sent/partial تغيير حالة فقط). */
async function assertItemsEditable(orderId: string): Promise<void> {
  const { data } = await supabase
    .from('purchase_orders')
    .select('status')
    .eq('id', orderId)
    .single();

  if (data && data.status !== 'draft') {
    throw new Error('Items can only be edited on a draft purchase order.');
  }
}

/** تحويل قيمة التاريخ الفارغة إلى null لتفادي خطأ PostgreSQL date. */
function sanitizeDate(v: string | null | undefined): string | null {
  if (!v || v === '') return null;
  return v;
}

function toError(error: PostgrestError, fallback: string): Error {
  if (error.code === '23505') {
    return new Error('A purchase order with this number already exists for this project.');
  }
  if (error.code === '42501') {
    return new Error('Permission denied. Run the purchase_orders migration in Supabase SQL Editor.');
  }
  return new Error(error.message || fallback);
}

/** توليد رقم تسلسلي للصف: BC-YYYY-XXX حسب سنة أمر الطلب. */
async function generateNextNumber(projectId: string, year: string): Promise<string> {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('number')
    .eq('project_id', projectId);

  if (error) return `BC-${year}-001`;

  let maxSeq = 0;
  for (const row of data || []) {
    const m = /BC-(\d{4})-(\d+)/.exec(row.number);
    if (m && m[1] === year) {
      const seq = parseInt(m[2], 10);
      if (!Number.isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  }
  return `BC-${year}-${String(maxSeq + 1).padStart(3, '0')}`;
}

// ═══════════════════════════════════════════════════════════════════
// الخدمة الرئيسية
// ═══════════════════════════════════════════════════════════════════

export const purchaseOrdersService = {
  // ── قائمة الأوامر (من الأحدث) ──
  async listByProject(projectId: string): Promise<PurchaseOrder[]> {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('project_id', projectId)
      .order('order_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      logError('listByProject', error);
      throw error;
    }
    return (data || []) as PurchaseOrder[];
  },

  // ── جلب الرأس + البنود ──
  async getById(id: string): Promise<PurchaseOrderWithItems | null> {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      logError('getById', error);
      throw error;
    }

    const order = data as PurchaseOrder;
    const items = await this.listItems(id);
    return { ...order, items };
  },

  // ── إنشاء أمـر طلب (مع ترقيم تلقائي) ──
  async create(input: CreatePurchaseOrderInput): Promise<PurchaseOrderWithItems> {
    // أوامر الشراء = نطاق التوريد (manage_procurement) — ينفذها أيضًا member.
    await assertPermission('manage_procurement');
    const year = new Date(input.order_date || Date.now()).getFullYear().toString();
    const number = input.number?.trim() || await generateNextNumber(input.project_id, year);
    const tva_rate = input.tva_rate ?? 19;

    const { data, error } = await supabase
      .from('purchase_orders')
      .insert({
        project_id: input.project_id,
        number,
        order_date: sanitizeDate(input.order_date),
        supplier_name: input.supplier_name,
        supplier_phone: input.supplier_phone || null,
        supplier_address: input.supplier_address || null,
        expected_delivery_date: sanitizeDate(input.expected_delivery_date),
        status: input.status || 'draft',
        notes: input.notes || null,
        tva_rate,
        total_ht: 0,
        total_tva: 0,
        total_ttc: 0,
      })
      .select()
      .single();

    if (error) {
      logError('create', error);
      throw toError(error, 'Failed to create purchase order');
    }

    const order = data as PurchaseOrder;

    // إضافة البنود
    const items: PurchaseOrderItem[] = [];
    for (const item of input.items) {
      items.push(await this.addItem(order.id, input.project_id, item));
    }

    // إعادة حساب الإجماليات
    await this.recalculateTotals(order.id);

    return { ...order, items };
  },

  // ── تحديث الرأس (فقط في draft) ──
  async update(id: string, input: UpdatePurchaseOrderInput): Promise<PurchaseOrder> {
    await assertPermission('manage_procurement');
    const { data: current } = await supabase
      .from('purchase_orders')
      .select('status')
      .eq('id', id)
      .single();

    if (current && current.status !== 'draft') {
      throw new Error('Only draft purchase orders can be edited.');
    }

    const { data, error } = await supabase
      .from('purchase_orders')
      .update({
        order_date: sanitizeDate(input.order_date),
        supplier_name: input.supplier_name,
        supplier_phone: input.supplier_phone || null,
        supplier_address: input.supplier_address || null,
        expected_delivery_date: sanitizeDate(input.expected_delivery_date),
        notes: input.notes || null,
        tva_rate: input.tva_rate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logError('update', error);
      throw error;
    }

    return data as PurchaseOrder;
  },

  // ── تحديث الحالة فقط ──
  async updateStatus(id: string, status: PurchaseOrder['status']): Promise<PurchaseOrder> {
    await assertPermission('manage_procurement');
    const { data: current } = await supabase
      .from('purchase_orders')
      .select('status')
      .eq('id', id)
      .single();

    if (current && !canChangeStatus(current.status, status)) {
      if (LOCKED_STATUSES.includes(current.status)) {
        throw new Error('A received or cancelled purchase order is final and cannot change status.');
      }
      throw new Error(`Status transition ${current.status} → ${status} is not allowed.`);
    }

    const { data, error } = await supabase
      .from('purchase_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logError('updateStatus', error);
      throw error;
    }
    return data as PurchaseOrder;
  },

  // ── حذف (في draft فقط) ──
  async remove(id: string): Promise<void> {
    await assertPermission('manage_procurement');
    const { data: current } = await supabase
      .from('purchase_orders')
      .select('status')
      .eq('id', id)
      .single();

    if (current && current.status !== 'draft') {
      throw new Error('Only draft purchase orders can be deleted.');
    }

    const { error } = await supabase
      .from('purchase_orders')
      .delete()
      .eq('id', id);

    if (error) {
      logError('remove', error);
      throw error;
    }
  },

  // ── البنود ──

  async listItems(orderId: string): Promise<PurchaseOrderItem[]> {
    const { data, error } = await supabase
      .from('purchase_order_items')
      .select('*')
      .eq('purchase_order_id', orderId)
      .order('sort_order', { ascending: true });

    if (error) {
      logError('listItems', error);
      throw error;
    }
    return (data || []) as PurchaseOrderItem[];
  },

  async addItem(orderId: string, projectId: string, input: CreatePurchaseOrderItemInput): Promise<PurchaseOrderItem> {
    await assertPermission('manage_procurement');
    await assertItemsEditable(orderId);

    const { data, error } = await supabase
      .from('purchase_order_items')
      .insert({
        purchase_order_id: orderId,
        project_id: projectId,
        material_id: input.material_id || null,
        designation: input.designation,
        unit: input.unit,
        quantity: input.quantity,
        unit_price_ht: input.unit_price_ht,
        amount_ht: input.quantity * input.unit_price_ht,
        notes: input.notes || null,
        sort_order: input.sort_order,
      })
      .select()
      .single();

    if (error) {
      logError('addItem', error);
      throw error;
    }

    await this.recalculateTotals(orderId);
    return data as PurchaseOrderItem;
  },

  async updateItem(id: string, input: Partial<CreatePurchaseOrderItemInput>): Promise<PurchaseOrderItem> {
    await assertPermission('manage_procurement');
    const { data: current } = await supabase
      .from('purchase_order_items')
      .select('purchase_order_id, quantity, unit_price_ht')
      .eq('id', id)
      .single();

    if (current) await assertItemsEditable(current.purchase_order_id);

    const quantity = input.quantity ?? current?.quantity ?? 0;
    const unit_price_ht = input.unit_price_ht ?? current?.unit_price_ht ?? 0;

    const { data, error } = await supabase
      .from('purchase_order_items')
      .update({
        material_id: input.material_id,
        designation: input.designation,
        unit: input.unit,
        quantity: input.quantity,
        unit_price_ht: input.unit_price_ht,
        amount_ht: quantity * unit_price_ht,
        notes: input.notes,
        sort_order: input.sort_order,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logError('updateItem', error);
      throw error;
    }

    if (current) await this.recalculateTotals(current.purchase_order_id);
    return data as PurchaseOrderItem;
  },

  async deleteItem(id: string): Promise<void> {
    await assertPermission('manage_procurement');
    const { data: current } = await supabase
      .from('purchase_order_items')
      .select('purchase_order_id')
      .eq('id', id)
      .single();

    if (current) await assertItemsEditable(current.purchase_order_id);

    const { error } = await supabase
      .from('purchase_order_items')
      .delete()
      .eq('id', id);

    if (error) {
      logError('deleteItem', error);
      throw error;
    }

    if (current) await this.recalculateTotals(current.purchase_order_id);
  },

  // ── إعادة حساب الإجماليات ──
  async recalculateTotals(orderId: string): Promise<void> {
    await assertPermission('manage_procurement');
    const { data: order } = await supabase
      .from('purchase_orders')
      .select('tva_rate')
      .eq('id', orderId)
      .single();

    const { data: items } = await supabase
      .from('purchase_order_items')
      .select('amount_ht')
      .eq('purchase_order_id', orderId);

    const total_ht = (items || []).reduce((sum, i) => sum + Number(i.amount_ht || 0), 0);
    const tva_rate = order?.tva_rate ?? 19;
    const total_tva = total_ht * (tva_rate / 100);
    const total_ttc = total_ht + total_tva;

    await supabase
      .from('purchase_orders')
      .update({
        total_ht,
        total_tva,
        total_ttc,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);
  },

  // ── Real-time ──
  subscribe(projectId: string, callback: () => void) {
    const channelName = `purchase-orders-${projectId}`;
    supabase.removeChannel(supabase.channel(channelName));

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'purchase_orders', filter: `project_id=eq.${projectId}` },
        () => callback()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'purchase_order_items', filter: `project_id=eq.${projectId}` },
        () => callback()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  },
};
