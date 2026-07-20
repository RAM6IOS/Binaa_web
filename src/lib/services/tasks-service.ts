import { createClient } from '../supabase/client';
import { ProjectTask, TaskStatus } from '../types/projects';
import { db } from '../db/offline-db';
import { checkNetworkStatus } from '../utils/network';

const supabase = createClient();

export const tasksService = {
  async getByProjectId(projectId: string) {
    const isOnline = await checkNetworkStatus();

    if (isOnline) {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const tasks = data as ProjectTask[];
        // Replace cache for this project
        await db.tasks.where('project_id').equals(projectId).delete();
        if (tasks.length > 0) {
          await db.tasks.bulkPut(tasks);
        }
        return tasks;
      } catch (err) {
        console.warn('[TasksService] Online fetch failed, falling back to local DB:', err);
      }
    }

    const local = await db.tasks
      .where('project_id')
      .equals(projectId)
      .toArray();
    return local.sort((a, b) =>
      (b.created_by ?? '').localeCompare(a.created_by ?? '')
    );
  },

  async create(task: Omit<ProjectTask, 'id'>) {
    const isOnline = await checkNetworkStatus();

    if (isOnline) {
      const { data, error } = await supabase
        .from('tasks')
        .insert([task])
        .select()
        .single();

      if (error) throw error;
      const created = data as ProjectTask;
      await db.tasks.put(created);
      return created;
    }

    const offlineTask: ProjectTask = {
      ...task,
      id: crypto.randomUUID(),
    } as ProjectTask;

    await db.tasks.put(offlineTask);
    await db.queue.add({
      table: 'tasks',
      action: 'create',
      targetId: offlineTask.id,
      payload: offlineTask,
      createdAt: Date.now(),
    });

    return offlineTask;
  },

  async update(id: string, updates: Partial<ProjectTask>) {
    const isOnline = await checkNetworkStatus();

    if (isOnline) {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      const updated = data as ProjectTask;
      await db.tasks.put(updated);
      return updated;
    }

    const existing = await db.tasks.get(id);
    if (!existing) throw new Error("المهمة غير موجودة محلياً");

    const offlineUpdated = { ...existing, ...updates } as ProjectTask;
    await db.tasks.put(offlineUpdated);
    await db.queue.add({
      table: 'tasks',
      action: 'update',
      targetId: id,
      payload: updates,
      createdAt: Date.now(),
    });

    return offlineUpdated;
  },

  async delete(id: string) {
    const isOnline = await checkNetworkStatus();

    if (isOnline) {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await db.tasks.delete(id);
      return true;
    }

    await db.tasks.delete(id);
    await db.queue.add({
      table: 'tasks',
      action: 'delete',
      targetId: id,
      payload: null,
      createdAt: Date.now(),
    });
    return true;
  },

  async updateStatus(taskId: string, status: TaskStatus) {
    const updates: Partial<ProjectTask> = { status };
    if (status === 'done') updates.progress = 100;
    if (status === 'todo') updates.progress = 0;

    return this.update(taskId, updates);
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
