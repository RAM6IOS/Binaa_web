import { createClient } from '../supabase/client';
import { Project } from '../types/projects';
import { db } from '../db/offline-db';
import { checkNetworkStatus } from '../utils/network';

const supabase = createClient();

/** Resolve user ID from session (offline-safe) or getUser (online). */
async function resolveUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.id) return session.user.id;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

export const projectsService = {
  async getById(id: string) {
    const isOnline = await checkNetworkStatus();

    if (isOnline) {
      try {
        const userId = await resolveUserId();
        if (!userId) throw new Error("غير مصرح");

        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .eq('created_by', userId)
          .single();

        if (error) throw error;

        const project = data as Project;
        await db.projects.put(project);
        return project;
      } catch (err) {
        console.warn('[ProjectsService] Online fetch failed, falling back to local DB:', err);
      }
    }

    const local = await db.projects.get(id);
    if (!local) throw new Error("المشروع غير موجود في التخزين المحلي");
    return local;
  },

  async getAll() {
    const isOnline = await checkNetworkStatus();

    if (isOnline) {
      try {
        const userId = await resolveUserId();
        if (!userId) return [];

        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('created_by', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const projects = data as Project[];
        // Replace local cache with fresh data
        await db.projects.clear();
        if (projects.length > 0) {
          await db.projects.bulkPut(projects);
        }
        return projects;
      } catch (err) {
        console.warn('[ProjectsService] Online fetch failed, falling back to local DB:', err);
      }
    }

    return await db.projects.toArray();
  },

  async create(projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>) {
    const userId = await resolveUserId();
    if (!userId) throw new Error("غير مصرح");

    const isOnline = await checkNetworkStatus();

    if (isOnline) {
      const payload = { ...projectData, created_by: userId };

      const { data, error } = await supabase
        .from('projects')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      const project = data as Project;
      await db.projects.put(project);
      return project;
    }

    // Offline: save locally + queue
    const offlineProject: Project = {
      ...projectData,
      id: crypto.randomUUID(),
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Project;

    await db.projects.put(offlineProject);
    await db.queue.add({
      table: 'projects',
      action: 'create',
      targetId: offlineProject.id,
      payload: offlineProject,
      createdAt: Date.now(),
    });

    return offlineProject;
  },

  async update(id: string, updates: Partial<Project>) {
    const isOnline = await checkNetworkStatus();

    if (isOnline) {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      const project = data as Project;
      await db.projects.put(project);
      return project;
    }

    // Offline update
    const existing = await db.projects.get(id);
    if (!existing) throw new Error("المشروع غير موجود محلياً");

    const updated = { ...existing, ...updates, updated_at: new Date().toISOString() } as Project;
    await db.projects.put(updated);
    await db.queue.add({
      table: 'projects',
      action: 'update',
      targetId: id,
      payload: updates,
      createdAt: Date.now(),
    });

    return updated;
  },

  async delete(id: string) {
    const isOnline = await checkNetworkStatus();

    if (isOnline) {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await db.projects.delete(id);
      return true;
    }

    await db.projects.delete(id);
    await db.queue.add({
      table: 'projects',
      action: 'delete',
      targetId: id,
      payload: null,
      createdAt: Date.now(),
    });
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