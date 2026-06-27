import { createClient } from '../supabase/client';
import { Worker } from '../types/projects';
import { createClient as createServerClient } from '@supabase/supabase-js'; // للـ Server-side إذا لزم

const supabase = createClient();

export const workersService = {
  async getAll() {
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Worker[];
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

    // جلب المستخدم الحالي
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('يجب تسجيل الدخول أولاً');

    const payload = {
      ...workerData,
      user_id: user.id,   // ← هذا مهم جداً لـ RLS
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

  async delete(id: string) {
    const { error } = await supabase
      .from('workers')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
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