import { createClient } from '@/lib/supabase/server';
import { Project } from '@/lib/types/projects';

export interface DashboardData {
  projects: Project[];
  workerCount: number;
  equipmentCount: number;
}

export async function fetchDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { projects: [], workerCount: 0, equipmentCount: 0 };
  }

  const [projectsRes, workersRes, equipmentRes] = await Promise.all([
    supabase
      .from('projects')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('workers')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('deleted_at', null),
    supabase
      .from('equipment')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('deleted_at', null),
  ]);

  return {
    projects: (projectsRes.data as Project[]) ?? [],
    workerCount: workersRes.count ?? 0,
    equipmentCount: equipmentRes.count ?? 0,
  };
}
