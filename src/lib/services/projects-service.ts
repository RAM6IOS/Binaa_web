import { createClient } from '../supabase/client';
import { Project } from '../types/projects';

const supabase = createClient();

export const projectsService = {
  async getById(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("غير مصرح");

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('created_by', user.id)   // أمان
      .single();

    if (error) throw error;
    return data as Project;
  },

  async getAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Project[];
  },

  async create(projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("غير مصرح");

    const payload = {
      ...projectData,
      created_by: user.id
    };

    const { data, error } = await supabase
      .from('projects')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data as Project;
  },

  // باقي الدوال (update, delete, subscribe) تبقى كما هي
  async update(id: string, updates: Partial<Project>) {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Project;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  subscribe(id: string, callback: () => void) {
    const channel = supabase
      .channel(`project-${id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'projects',
        filter: `id=eq.${id}`
      }, () => callback())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }
};