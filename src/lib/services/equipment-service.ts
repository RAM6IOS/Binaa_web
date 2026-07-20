import { createClient } from '../supabase/client';
import { Equipment } from '../types/projects';
import { db } from '../db/offline-db';
import { checkNetworkStatus } from '../utils/network';

const supabase = createClient();

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

export const equipmentService = {
  async getAll() {
    const isOnline = await checkNetworkStatus();

    if (isOnline) {
      try {
        const userId = await resolveUserId();
        if (!userId) throw new Error('غير مصرح');

        const { data, error } = await supabase
          .from('equipment')
          .select('*')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const items = data as Equipment[];
        await db.equipment.clear();
        if (items.length > 0) {
          await db.equipment.bulkPut(items);
        }
        return items;
      } catch (err) {
        console.warn('[EquipmentService] Online fetch failed, falling back to local DB:', err);
      }
    }

    return (await db.equipment.toArray()).filter(e => !e.deleted_at);
  },

  async create(equipment: Omit<Equipment, 'id' | 'created_at' | 'user_id'>) {
    const userId = await resolveUserId();
    if (!userId) throw new Error('غير مصرح');

    const isOnline = await checkNetworkStatus();
    const payload = { ...equipment, user_id: userId };

    if (isOnline) {
      const { data, error } = await supabase
        .from('equipment')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      const item = data as Equipment;
      await db.equipment.put(item);
      return item;
    }

    const offlineItem: Equipment = {
      ...payload,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    } as Equipment;

    await db.equipment.put(offlineItem);
    await db.queue.add({
      table: 'equipment',
      action: 'create',
      targetId: offlineItem.id,
      payload: offlineItem,
      createdAt: Date.now(),
    });

    return offlineItem;
  },

  async update(id: string, updates: Partial<Equipment>) {
    const isOnline = await checkNetworkStatus();

    if (isOnline) {
      const userId = await resolveUserId();
      if (!userId) throw new Error('غير مصرح');

      const { data, error } = await supabase
        .from('equipment')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      const item = data as Equipment;
      await db.equipment.put(item);
      return item;
    }

    const existing = await db.equipment.get(id);
    if (!existing) throw new Error("المعدة غير موجودة محلياً");

    const updated = { ...existing, ...updates } as Equipment;
    await db.equipment.put(updated);
    await db.queue.add({
      table: 'equipment',
      action: 'update',
      targetId: id,
      payload: updates,
      createdAt: Date.now(),
    });

    return updated;
  },

  async getProjectCount(id: string) {
    try {
      const { count } = await supabase
        .from('project_equipment')
        .select('id', { count: 'exact', head: true })
        .eq('equipment_id', id);
      return count || 0;
    } catch {
      return 0;
    }
  },

  async delete(id: string) {
    const userId = await resolveUserId();
    if (!userId) throw new Error('غير مصرح');

    const isOnline = await checkNetworkStatus();

    if (isOnline) {
      const projectCount = await this.getProjectCount(id);

      if (projectCount >= 1) {
        const { error } = await supabase
          .from('equipment')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', userId);

        if (error) throw error;
        await db.equipment.delete(id);
        return { softDeleted: true, projectCount };
      }

      const { error: assocError } = await supabase
        .from('project_equipment')
        .delete()
        .eq('equipment_id', id);

      if (assocError) throw assocError;

      const { error } = await supabase
        .from('equipment')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      await db.equipment.delete(id);
      return { softDeleted: false, projectCount: 0 };
    }

    await db.equipment.delete(id);
    await db.queue.add({
      table: 'equipment',
      action: 'delete',
      targetId: id,
      payload: null,
      createdAt: Date.now(),
    });

    return { softDeleted: false, projectCount: 0 };
  }
};
