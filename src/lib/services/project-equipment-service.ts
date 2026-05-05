import { createClient } from '../supabase/client';
import { ProjectEquipment } from '../types/projects';

const supabase = createClient();

export const projectEquipmentService = {
  async getByProjectId(projectId: string) {
    return this.fetchProjectEquipment(projectId);
  },

  async fetchProjectEquipment(projectId: string) {
    const { data, error } = await supabase
      .from('project_equipment')
      .select(`
        *,
        equipment:equipment(*)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching project equipment:', error);
      throw error;
    }
    return data as ProjectEquipment[];
  },

  async assign(data: Omit<ProjectEquipment, 'id' | 'assigned_at'>) {
    const { data: result, error } = await supabase
      .from('project_equipment')
      .insert([data])
      .select()
      .single();
    
    if (error) throw error;
    return result;
  },

  async remove(id: string) {
    const { error } = await supabase
      .from('project_equipment')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
};
