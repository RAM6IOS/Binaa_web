import { createClient } from '../supabase/client';
import { Worker } from '../types/projects';

const supabase = createClient();

export const workersService = {
  async getAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("غير مصرح");

    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Worker;
  },

  async create(workerData: Omit<Worker, 'id' | 'created_at' | 'updated_at'>) {
    const supabaseClient = createClient();

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('يجب تسجيل الدخول أولاً');

    const payload = {
      ...workerData,
      user_id: user.id,
    };

    const { data, error } = await supabase
      .from('workers')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data as Worker;
  },

  async update(id: string, updates: Partial<Worker>) {
    const { data, error } = await supabase
      .from('workers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Worker;
  },

  async getProjectCount(id: string) {
    const { count } = await supabase
      .from('project_workers')
      .select('id', { count: 'exact', head: true })
      .eq('worker_id', id);

    return count || 0;
  },

  async delete(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("غير مصرح");

    const projectCount = await this.getProjectCount(id);

    if (projectCount >= 1) {
      const { error } = await supabase
        .from('workers')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
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
      .eq('user_id', user.id);

    if (error) throw error;
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