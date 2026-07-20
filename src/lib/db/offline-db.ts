import Dexie, { type Table } from 'dexie';
import { Project, Worker, Equipment, ProjectTask } from '../types/projects';
import { DailyLog } from '../types/daily-logs';

export interface SyncQueueItem {
  id?: number;
  table: 'projects' | 'workers' | 'equipment' | 'daily_logs' | 'tasks';
  action: 'create' | 'update' | 'delete';
  targetId: string;
  payload: any;
  createdAt: number;
}

export class BinaaOfflineDatabase extends Dexie {
  projects!: Table<Project>;
  workers!: Table<Worker>;
  equipment!: Table<Equipment>;
  daily_logs!: Table<DailyLog>;
  tasks!: Table<ProjectTask>;
  queue!: Table<SyncQueueItem>;

  constructor() {
    super('BinaaOfflineDB');
    this.version(1).stores({
      projects: 'id, name, status, created_by',
      workers: 'id, full_name, user_id, deleted_at',
      equipment: 'id, name, user_id, deleted_at',
      daily_logs: 'id, project_id, log_date, status',
      tasks: 'id, project_id, status, priority',
      queue: '++id, table, action, targetId, createdAt',
    });
  }
}

export const db = new BinaaOfflineDatabase();
