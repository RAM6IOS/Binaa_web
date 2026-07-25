import { createClient } from '../supabase/client';
import {
  Material, CreateMaterialDto, UpdateMaterialDto,
  MaterialConsumption, CreateConsumptionDto,
  MaterialWithStats, MaterialsSummary,
} from '../types/materials';
import { DailyLogMaterialConsumption } from '../types/daily-logs';

const supabase = createClient();

/** Resolve user ID from session (offline-safe) or getUser (online). */
async function resolveUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.id) return session.user.id;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

// ── جلب إحصائيات الاستهلاك لكل مادة (محسوب من DB) ──
async function fetchConsumptionStats(projectId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('material_consumptions')
    .select('material_id, quantity')
    .eq('project_id', projectId);

  if (error) {
    console.error('[Materials] Consumption stats error:', error.message);
    return {};
  }

  const map: Record<string, number> = {};
  for (const row of (data || [])) {
    map[row.material_id] = (map[row.material_id] || 0) + Number(row.quantity);
  }
  return map;
}

export const materialsService = {
  // ── جلب المواد مع إحصائيات الاستهلاك ──
  async getWithStats(projectId: string): Promise<MaterialWithStats[]> {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Materials] Fetch error:', error.message);
      throw error;
    }

    const consumptionMap = await fetchConsumptionStats(projectId);

    return (data || []).map((m) => {
      const total_consumed = consumptionMap[m.id] || 0;
      return {
        ...m,
        total_consumed,
        remaining_quantity: Number(m.initial_quantity) - total_consumed,
        consumptions_count: 0, // يمكن توسيعه لاحقاً
      } as MaterialWithStats;
    });
  },

  // ── جلب ملخص المواد ──
  async getSummary(projectId: string): Promise<MaterialsSummary> {
    const materials = await this.getWithStats(projectId);
    return {
      total_materials: materials.length,
      total_initial_value: materials.reduce((s, m) => s + (m.initial_quantity * m.unit_price), 0),
      total_consumed_value: materials.reduce((s, m) => s + (m.total_consumed * m.unit_price), 0),
      total_remaining_value: materials.reduce((s, m) => s + (m.remaining_quantity * m.unit_price), 0),
    };
  },

  // ── CRUD ──
  async create(dto: CreateMaterialDto): Promise<Material> {
    const userId = await resolveUserId();
    if (!userId) throw new Error("غير مصرح");

    const { data, error } = await supabase
      .from('materials')
      .insert({ ...dto, created_by: userId })
      .select()
      .single();

    if (error) {
      console.error('[Materials] Create error:', error.message);
      throw error;
    }
    return data as Material;
  },

  async update(id: string, dto: UpdateMaterialDto): Promise<Material> {
    const { data, error } = await supabase
      .from('materials')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Materials] Update error:', error.message);
      throw error;
    }
    return data as Material;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Materials] Delete error:', error.message);
      throw error;
    }
  },

  // ── Realtime ──
  subscribe(projectId: string, callback: () => void) {
    const channel = supabase
      .channel(`materials-${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'materials', filter: `project_id=eq.${projectId}` },
        () => callback()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  },

  // ── جلب استهلاكات المواد لتقرير يومي معيّن ──
  async getConsumptionsByDailyLogId(dailyLogId: string): Promise<DailyLogMaterialConsumption[]> {
    const { data, error } = await supabase
      .from('material_consumptions')
      .select('material_id, quantity, notes, materials(name)')
      .eq('daily_log_id', dailyLogId);

    if (error) {
      console.error('[Materials] Fetch consumptions error:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      material_id: row.material_id,
      material_name: row.materials?.name ?? '',
      consumed_quantity: Number(row.quantity),
      notes: row.notes ?? undefined,
    }));
  },
};
