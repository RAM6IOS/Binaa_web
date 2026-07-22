import { createClient } from '../supabase/client';
import {
  Metre, CreateMetreDto, UpdateMetreDto,
  ContractItem, ContractItemWithProgress, MetresSummary
} from '../types/metres';

const supabase = createClient();

export const metresService = {
  // ── جلب الكميات المنجزة للمشروع ──
  async getByProjectId(projectId: string): Promise<Metre[]> {
    const { data, error } = await supabase
      .from('metres')
      .select('*')
      .eq('project_id', projectId)
      .order('log_date', { ascending: false });

    if (error) {
      console.error('[Metres] Fetch error:', error.message);
      throw error;
    }

    return (data || []) as Metre[];
  },

  // ── جلب الكميات حسب بند العقد ──
  async getByContractItemId(contractItemId: string): Promise<Metre[]> {
    const { data, error } = await supabase
      .from('metres')
      .select('*')
      .eq('contract_item_id', contractItemId)
      .order('log_date', { ascending: false });

    if (error) throw error;
    return (data || []) as Metre[];
  },

  // ── جلب الكميات حسب التقرير اليومي ──
  async getByDailyLogId(dailyLogId: string): Promise<Metre[]> {
    const { data, error } = await supabase
      .from('metres')
      .select('*')
      .eq('daily_log_id', dailyLogId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as Metre[];
  },

  // ── تسجيل كمية منجزة ──
  async create(dto: CreateMetreDto): Promise<Metre> {
    let userId: string | undefined;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      userId = session.user.id;
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) userId = user.id;
    }

    const payload = {
      ...dto,
      created_by: userId,
    };

    const { data, error } = await supabase
      .from('metres')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[Metres] Create error:', error.message);
      throw error;
    }

    return data as Metre;
  },

  // ── تسجيل عدة كميات دفعة واحدة ──
  async createMany(dtos: CreateMetreDto[]): Promise<Metre[]> {
    let userId: string | undefined;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      userId = session.user.id;
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) userId = user.id;
    }

    const payloads = dtos.map(d => ({ ...d, created_by: userId }));

    const { data, error } = await supabase
      .from('metres')
      .insert(payloads)
      .select();

    if (error) {
      console.error('[Metres] CreateMany error:', error.message);
      throw error;
    }

    return (data || []) as Metre[];
  },

  // ── تحديث كمية ──
  async update(id: string, dto: UpdateMetreDto): Promise<Metre> {
    const { data, error } = await supabase
      .from('metres')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Metre;
  },

  // ── حذف كمية ──
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('metres')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // ── حذف كل كميات يومية معينة ──
  async deleteByDailyLogId(dailyLogId: string): Promise<void> {
    const { error } = await supabase
      .from('metres')
      .delete()
      .eq('daily_log_id', dailyLogId);

    if (error) throw error;
  },

  // ── حساب بنود العقد مع تقدم الإنجاز ──
  async getItemsWithProgress(projectId: string): Promise<ContractItemWithProgress[]> {
    const [items, metres] = await Promise.all([
      this._getContractItems(projectId),
      this.getByProjectId(projectId),
    ]);

    return items.map(item => {
      const itemMetres = metres.filter(m => m.contract_item_id === item.id);
      const total_achieved = itemMetres.reduce((sum, m) => sum + (m.achieved_quantity || 0), 0);
      const progress_percent = item.quantity > 0
        ? Math.min(100, Math.round((total_achieved / item.quantity) * 100))
        : 0;
      const achieved_amount = total_achieved * item.unit_price;
      const remaining_quantity = Math.max(0, item.quantity - total_achieved);

      return {
        ...item,
        total_achieved,
        progress_percent,
        achieved_amount,
        remaining_quantity,
        metres_count: itemMetres.length,
      };
    });
  },

  // ── ملخص عام للمقاسات ──
  async getSummary(projectId: string): Promise<MetresSummary> {
    const itemsWithProgress = await this.getItemsWithProgress(projectId);

    const total_contract_value = itemsWithProgress.reduce(
      (sum, item) => sum + (item.quantity * item.unit_price), 0
    );
    const total_achieved_value = itemsWithProgress.reduce(
      (sum, item) => sum + item.achieved_amount, 0
    );
    const overall_progress = total_contract_value > 0
      ? Math.round((total_achieved_value / total_contract_value) * 100)
      : 0;
    const total_items = itemsWithProgress.length;
    const completed_items = itemsWithProgress.filter(i => i.progress_percent >= 100).length;
    const total_metres = itemsWithProgress.reduce((sum, i) => sum + i.metres_count, 0);

    return {
      total_contract_value,
      total_achieved_value,
      overall_progress,
      total_items,
      completed_items,
      total_metres,
    };
  },

  // ── جلب بنود العقد (داخلي) ──
  async _getContractItems(projectId: string): Promise<ContractItem[]> {
    const { data, error } = await supabase
      .from('contract_items')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })
      .order('item_number', { ascending: true });

    if (error) throw error;
    return (data || []) as ContractItem[];
  },

  // ── اشتراك في التغييرات ──
  subscribe(projectId: string, callback: () => void) {
    const channel = supabase
      .channel(`metres-${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'metres', filter: `project_id=eq.${projectId}` },
        () => callback()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  },
};
