import Dexie, { type Table } from 'dexie';
import { Project, Worker, Equipment, ProjectTask } from '../types/projects';
import { DailyLog } from '../types/daily-logs';
import { ContractItem, Metre } from '../types/metres';
import { Material } from '../types/materials';

export interface SyncQueueItem {
  id?: number;
  table: 'projects' | 'workers' | 'equipment' | 'daily_logs' | 'tasks' | 'contract_items' | 'metres' | 'materials';
  action: 'create' | 'update' | 'delete';
  targetId: string;
  payload: any;
  createdAt: number;
  /** حالات الصف للمزامنة: pending (افتراضي) أو failed (يحتاج مراجعة). */
  status?: 'pending' | 'failed';
  errorCount?: number;
  lastError?: string;
  updatedAt?: number;
}

export class BinaaOfflineDatabase extends Dexie {
  projects!: Table<Project>;
  workers!: Table<Worker>;
  equipment!: Table<Equipment>;
  daily_logs!: Table<DailyLog>;
  tasks!: Table<ProjectTask>;
  contract_items!: Table<ContractItem>;
  metres!: Table<Metre>;
  materials!: Table<Material>;
  queue!: Table<SyncQueueItem>;

  constructor() {
    super('BinaaOfflineDB');
    this.version(3).stores({
      projects: 'id, name, status, created_by',
      workers: 'id, full_name, user_id, deleted_at',
      equipment: 'id, name, user_id, deleted_at',
      daily_logs: 'id, project_id, log_date, status',
      tasks: 'id, project_id, status, priority',
      contract_items: 'id, project_id, item_number',
      metres: 'id, project_id, daily_log_id, contract_item_id, log_date',
      materials: 'id, project_id, name',
      queue: '++id, table, action, targetId, createdAt',
    });

    // v4: يعرّف حالة صف المزامنة (pending/failed) حتى لا تُحذف العناصر الفاشلة
    // صامتةً من الـ queue (كانت تُفقد بيانات بلا أعثر). الصفوف القديمة تظل
    // بلا status أي تُعامَل كـ pending تلقائياً.
    this.version(4).stores({
      projects: 'id, name, status, created_by',
      workers: 'id, full_name, user_id, deleted_at',
      equipment: 'id, name, user_id, deleted_at',
      daily_logs: 'id, project_id, log_date, status',
      tasks: 'id, project_id, status, priority',
      contract_items: 'id, project_id, item_number',
      metres: 'id, project_id, daily_log_id, contract_item_id, log_date',
      materials: 'id, project_id, name',
      queue: '++id, table, action, targetId, createdAt, status',
    });
  }
}

export const db = new BinaaOfflineDatabase();
