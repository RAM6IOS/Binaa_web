import { createClient } from '../supabase/client';
import { Equipment } from '../types/projects';

const supabase = createClient();

export const equipmentService = {
  async getAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('غير مصرح');

    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Equipment[];
  },

  async create(equipment: Omit<Equipment, 'id' | 'created_at' | 'user_id'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('غير مصرح');

    const { data, error } = await supabase
      .from('equipment')
      .insert([{ ...equipment, user_id: user.id }])
      .select()
      .single();
    
    if (error) throw error;
    return data as Equipment;
  },

  async update(id: string, updates: Partial<Equipment>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('غير مصرح');

    const { data, error } = await supabase
      .from('equipment')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Equipment;
  },

  async getProjectCount(id: string) {
    const { count } = await supabase
      .from('project_equipment')
      .select('id', { count: 'exact', head: true })
      .eq('equipment_id', id);

    return count || 0;
  },

  async delete(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('غير مصرح');

    const projectCount = await this.getProjectCount(id);

    if (projectCount >= 1) {
      const { error } = await supabase
        .from('equipment')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
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
      .eq('user_id', user.id);

    if (error) throw error;
    return { softDeleted: false, projectCount: 0 };
  }
};
