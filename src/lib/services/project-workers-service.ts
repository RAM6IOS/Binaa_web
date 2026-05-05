import { createClient } from '../supabase/client';
import { ProjectWorker } from '../types/projects';

const supabase = createClient();

export const projectWorkersService = {
  async getByProjectId(projectId: string) {
    return this.fetchProjectWorkers(projectId);
  },

  async fetchProjectWorkers(projectId: string) {
    const { data, error } = await supabase
      .from('project_workers')
      .select(`
        *,
        worker:workers(*)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching project workers:', error);
      throw error;
    }
    return data as ProjectWorker[];
  },

  async assign(assignments: Omit<ProjectWorker, 'id' | 'assigned_at'>[]) {
    const { data, error } = await supabase
      .from('project_workers')
      .insert(assignments)
      .select();
    
    if (error) throw error;
    return data;
  },

  async remove(id: string) {
    const { error } = await supabase
      .from('project_workers')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  async update(id: string, updates: Partial<ProjectWorker>) {
    const { data, error } = await supabase
      .from('project_workers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as ProjectWorker;
  }
};
