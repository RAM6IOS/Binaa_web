import { createClient } from '../supabase/client';

export interface GanttTask {
    id: string;
    project_id: string;
    title: string;
    description?: string;
    start_date: string;
    due_date: string;
    progress: number;
    status: string;
    priority: string;
    assigned_to?: string;
    parent_task_id?: string;
    dependency_ids: string[];
    is_milestone: boolean;
    order_index: number;
    color?: string;
}

export const ganttService = {

    /**
     * جلب جميع المهام للمشروع مع هيكل Gantt
     */
    async getProjectTasks(projectId: string) {
        const supabase = createClient();

        const { data, error } = await supabase
            .from('tasks')
            .select(`
        *,
        assigned_worker:workers(id, full_name, job_title)
      `)
            .eq('project_id', projectId)
            .order('order_index', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    /**
     * تحديث تاريخ المهمة (Drag & Drop)
     */
    async updateTaskDates(taskId: string, startDate: string, dueDate: string) {
        const supabase = createClient();

        const { data, error } = await supabase
            .from('tasks')
            .update({
                start_date: startDate,
                due_date: dueDate,
                updated_at: new Date().toISOString()
            })
            .eq('id', taskId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * تحديث ترتيب المهام (Order Index)
     */
    async updateTasksOrder(tasks: { id: string; order_index: number }[]) {
        const supabase = createClient();

        const updates = tasks.map(task =>
            supabase
                .from('tasks')
                .update({ order_index: task.order_index })
                .eq('id', task.id)
        );

        const results = await Promise.all(updates);
        return results;
    },

    /**
     * إضافة تبعية بين مهمتين
     */
    async addDependency(taskId: string, dependencyId: string) {
        const supabase = createClient();

        const { data: task } = await supabase
            .from('tasks')
            .select('dependency_ids')
            .eq('id', taskId)
            .single();

        const dependencies = task?.dependency_ids || [];
        if (!dependencies.includes(dependencyId)) {
            dependencies.push(dependencyId);
        }

        const { error } = await supabase
            .from('tasks')
            .update({ dependency_ids: dependencies })
            .eq('id', taskId);

        if (error) throw error;
        return true;
    }
};