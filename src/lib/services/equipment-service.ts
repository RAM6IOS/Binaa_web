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

  async delete(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('غير مصرح');

    const { error } = await supabase
      .from('equipment')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) throw error;
    return true;
  }
};
