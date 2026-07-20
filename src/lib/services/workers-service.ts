import { createClient } from '../supabase/client';
import { Worker } from '../types/projects';
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

export const workersService = {
  async getAll() {
    const isOnline = await checkNetworkStatus();

    if (isOnline) {
      try {
        const userId = await resolveUserId();
        if (!userId) throw new Error("غير مصرح");

        const { data, error } = await supabase
          .from('workers')
          .select('*')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const workers = data as Worker[];
        await db.workers.clear();
        if (workers.length > 0) {
          await db.workers.bulkPut(workers);
        }
        return workers;
      } catch (err) {
        console.warn('[WorkersService] Online fetch failed, falling back to local DB:', err);
      }
    }

    // Offline: return locally cached workers (filter out soft-deleted)
    return (await db.workers.toArray()).filter(w => !w.deleted_at);
  },

  async getById(id: string) {
    const isOnline = await checkNetworkStatus();

    if (isOnline) {
      try {
        const { data, error } = await supabase
          .from('workers')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        const worker = data as Worker;
        await db.workers.put(worker);
        return worker;
      } catch (err) {
        console.warn('[WorkersService] Online fetch by ID failed, falling back to local DB:', err);
      }
    }

    const local = await db.workers.get(id);
    if (!local) throw new Error("العامل غير موجود في التخزين المحلي");
    return local;
  },

  async create(workerData: Omit<Worker, 'id' | 'created_at' | 'updated_at'>) {
    const userId = await resolveUserId();
    if (!userId) throw new Error('يجب تسجيل الدخول أولاً');

    const isOnline = await checkNetworkStatus();
    const payload = { ...workerData, user_id: userId };

    if (isOnline) {
      const { data, error } = await supabase
        .from('workers')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      const worker = data as Worker;
      await db.workers.put(worker);
      return worker;
    }

    const offlineWorker: Worker = {
      ...payload,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    } as Worker;

    await db.workers.put(offlineWorker);
    await db.queue.add({
      table: 'workers',
      action: 'create',
      targetId: offlineWorker.id,
      payload: offlineWorker,
      createdAt: Date.now(),
    });

    return offlineWorker;
  },

  async update(id: string, updates: Partial<Worker>) {
    const isOnline = await checkNetworkStatus();

    if (isOnline) {
      const { data, error } = await supabase
        .from('workers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      const worker = data as Worker;
      await db.workers.put(worker);
      return worker;
    }

    const existing = await db.workers.get(id);
    if (!existing) throw new Error("العامل غير موجود محلياً");

    const updated = { ...existing, ...updates } as Worker;
    await db.workers.put(updated);
    await db.queue.add({
      table: 'workers',
      action: 'update',
      targetId: id,
      payload: updates,
      createdAt: Date.now(),
    });

    return updated;
  },

  async getProjectCount(id: string) {
    // This is a lightweight query; skip offline caching for it
    try {
      const { count } = await supabase
        .from('project_workers')
        .select('id', { count: 'exact', head: true })
        .eq('worker_id', id);
      return count || 0;
    } catch {
      return 0;
    }
  },

  async delete(id: string) {
    const userId = await resolveUserId();
    if (!userId) throw new Error("غير مصرح");

    const isOnline = await checkNetworkStatus();

    if (isOnline) {
      const projectCount = await this.getProjectCount(id);

      if (projectCount >= 1) {
        const { error } = await supabase
          .from('workers')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', userId);

        if (error) throw error;
        await db.workers.delete(id);
        return { softDeleted: true, projectCount };
      }

      const { error: assocError } = await supabase
        .from('project_workers')
        .delete()
        .eq('worker_id', id);

      if (assocError) throw assocError;

      const { error } = await supabase
        .from('workers')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      await db.workers.delete(id);
      return { softDeleted: false, projectCount: 0 };
    }

    // Offline delete: remove locally and queue
    await db.workers.delete(id);
    await db.queue.add({
      table: 'workers',
      action: 'delete',
      targetId: id,
      payload: null,
      createdAt: Date.now(),
    });

    return { softDeleted: false, projectCount: 0 };
  },

  subscribe(callback: () => void) {
    const channel = supabase
      .channel('workers-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workers' },
        () => callback()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }
};