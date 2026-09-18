import { createClient } from '../supabase/client';
import { Equipment } from '../types/projects';
import { db } from '../db/offline-db';
import { checkNetworkStatus, isNetworkError } from '../utils/network';
import { markOnlineSync, assertOfflineWriteAllowed } from '../utils/offline-window';
import { assertPermission, resolveMyCompanyId } from './guard';
import { resolveCurrentUserId, resolveMyDataScope } from './user-scope';

const supabase = createClient();

export const equipmentService = {
  async getAll() {
    try {
      const { userId, companyId } = await resolveMyDataScope();
      if (!userId) return [];

      const base = supabase
        .from('equipment')
        .select('*')
        .is('deleted_at', null);
      // لا عضوية شركة (بيانات قديمة أو حساب غير مرتبط): نقرأ بيانات الحساب
      // الشخصي بدل الإرجاع الفارغ الصامت الذي أَخفى محتوى المستخدمين.
      const scoped = companyId ? base.eq('company_id', companyId) : base.eq('user_id', userId);
      const { data, error } = await scoped.order('created_at', { ascending: false });

      if (error) throw error;

      const items = data as Equipment[];
      await db.equipment.clear();
      if (items.length > 0) {
        await db.equipment.bulkPut(items);
      }
      markOnlineSync();
      return items;
    } catch (err) {
      // «الخادم أولاً»: الكاش ملاذ أخير عند انقطاع حقيقي فقط.
      if (!isNetworkError(err)) throw err;
      console.warn('[EquipmentService] الشبكة غير متاحة، قراءة من التخزين المحلي:', err);
      return (await db.equipment.toArray()).filter(e => !e.deleted_at);
    }
  },

  async create(equipment: Omit<Equipment, 'id' | 'created_at' | 'user_id'>) {
    const userId = await resolveCurrentUserId();
    if (!userId) throw new Error('غير مصرح');
    const membership = await assertPermission('manage_projects');

    const companyId = membership?.company_id ?? (await resolveMyCompanyId());
    if (!companyId) throw new Error('لم يتم العثور على شركة المستخدم');

    const isOnline = await checkNetworkStatus();
    const payload = { ...equipment, user_id: userId, company_id: companyId };

    if (isOnline) {
      const { data, error } = await supabase
        .from('equipment')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      const item = data as Equipment;
      await db.equipment.put(item);
      markOnlineSync();
      return item;
    }

    assertOfflineWriteAllowed();
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
    await assertPermission('manage_projects');

    const isOnline = await checkNetworkStatus();

    if (isOnline) {
      const { data, error } = await supabase
        .from('equipment')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      const item = data as Equipment;
      await db.equipment.put(item);
      markOnlineSync();
      return item;
    }

    const existing = await db.equipment.get(id);
    if (!existing) throw new Error("المعدة غير موجودة محلياً");

    assertOfflineWriteAllowed();
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
    const userId = await resolveCurrentUserId();
    if (!userId) throw new Error('غير مصرح');
    await assertPermission('manage_projects');

    const isOnline = await checkNetworkStatus();

    if (isOnline) {
      const projectCount = await this.getProjectCount(id);

      if (projectCount >= 1) {
        const { error } = await supabase
          .from('equipment')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id);

        if (error) throw error;
        await db.equipment.delete(id);
        markOnlineSync();
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
        .eq('id', id);

      if (error) throw error;
      await db.equipment.delete(id);
      markOnlineSync();
      return { softDeleted: false, projectCount: 0 };
    }

    assertOfflineWriteAllowed();
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
