import { createClient } from '../supabase/client';
import { Project } from '../types/projects';
import { db } from '../db/offline-db';
import { checkNetworkStatus } from '../utils/network';
import { markOnlineSync, assertOfflineWriteAllowed } from '../utils/offline-window';
import { assertPermission, resolveMyCompanyId } from './guard';

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

        const companyId = await resolveMyCompanyId();
        let query = supabase
          .from('projects')
          .select('*')
          .eq('id', id);
        if (companyId) {
          query = query.or(`created_by.eq.${userId},company_id.eq.${companyId}`);
        } else {
          query = query.eq('created_by', userId);
        }

        const { data, error } = await query.single();

        if (error) throw error;

        const project = data as Project;
        await db.projects.put(project);
        markOnlineSync();
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

        const companyId = await resolveMyCompanyId();
        let query = supabase
          .from('projects')
          .select('*');
        if (companyId) {
          query = query.or(`created_by.eq.${userId},company_id.eq.${companyId}`);
        } else {
          query = query.eq('created_by', userId);
        }
        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) throw error;

        const projects = data as Project[];
        // Replace local cache with fresh data
        await db.projects.clear();
        if (projects.length > 0) {
          await db.projects.bulkPut(projects);
        }
        markOnlineSync();
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

    // الشرط المُلزم: owner/admin فقط (manage_projects). العضوية (مع الدور) هي أيضاً
    // المصدر الوحيد لشركة الإدراج — يمنع إنشاء مشروع خارج الشركة أو بلا شركة (RLS).
    const membership = await assertPermission('manage_projects');
    const companyId = membership?.company_id ?? null;

    const isOnline = await checkNetworkStatus();

    if (isOnline) {
      const payload = {
        ...projectData,
        created_by: userId,
        ...(companyId ? { company_id: companyId } : {}),
      };

      const { data, error } = await supabase
        .from('projects')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      const project = data as Project;
      await db.projects.put(project);
      markOnlineSync();
      return project;
    }

    // Offline: save locally + queue (التحقق من الدور أعلاه يمر عبر كاش العضوية)
    assertOfflineWriteAllowed();
    const offlineProject: Project = {
      ...projectData,
      id: crypto.randomUUID(),
      created_by: userId,
      company_id: companyId ?? undefined,
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
    await assertPermission('manage_projects');

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
      markOnlineSync();
      return project;
    }

    // Offline update
    assertOfflineWriteAllowed();
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
    await assertPermission('manage_projects');

    const isOnline = await checkNetworkStatus();

    if (isOnline) {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await db.projects.delete(id);
      markOnlineSync();
      return true;
    }

    assertOfflineWriteAllowed();
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
    const channelName = `project-${id}`;
    supabase.removeChannel(supabase.channel(channelName));

    const channel = supabase
      .channel(channelName)
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