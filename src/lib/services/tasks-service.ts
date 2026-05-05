import { createClient } from '../supabase/client';
import { ProjectTask, TaskStatus } from '../types/projects';

const supabase = createClient();

export const tasksService = {
  async getByProjectId(projectId: string) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as ProjectTask[];
  },

  async create(task: Omit<ProjectTask, 'id'>) {
    const { data, error } = await supabase
      .from('tasks')
      .insert([task])
      .select()
      .single();
    
    if (error) throw error;
    return data as ProjectTask;
  },

  async update(id: string, updates: Partial<ProjectTask>) {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as ProjectTask;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  async updateStatus(taskId: string, status: TaskStatus) {
    const updates: Partial<ProjectTask> = { status };
    if (status === 'done') updates.progress = 100;
    if (status === 'todo') updates.progress = 0;

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();
    
    if (error) throw error;
    return data as ProjectTask;
  },

  subscribe(projectId: string, callback: () => void) {
    const channel = supabase
      .channel(`tasks-${projectId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'tasks',
          filter: `project_id=eq.${projectId}`
        },
        () => callback()
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }
};
