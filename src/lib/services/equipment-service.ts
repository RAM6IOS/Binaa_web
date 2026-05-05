import { createClient } from '../supabase/client';
import { Equipment } from '../types/projects';

const supabase = createClient();

export const equipmentService = {
  async getAll() {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Equipment[];
  },

  async create(equipment: Omit<Equipment, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('equipment')
      .insert([equipment])
      .select()
      .single();
    
    if (error) throw error;
    return data as Equipment;
  },

  async update(id: string, updates: Partial<Equipment>) {
    const { data, error } = await supabase
      .from('equipment')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Equipment;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('equipment')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
};
