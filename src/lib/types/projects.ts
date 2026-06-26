export type ProjectStatus = 'planning' | 'in_progress' | 'completed' | 'delayed' | 'cancelled';
export type ProjectType = 'road' | 'bridge' | 'housing' | 'school' | 'hospital' | 'infrastructure';

export interface Project {
  id: string;
  name: string;
  description?: string;
  project_type: ProjectType;
  wilaya: string;
  start_date: string;
  expected_end_date: string;
  actual_end_date?: string;
  status: ProjectStatus;
  budget: number;
  actual_cost: number;
  progress: number;
  created_by?: string;
  contract_number?: string;
  client_name?: string;
  location_coordinates?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'delayed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ProjectTask {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  start_date: string;
  due_date: string;
  progress: number;
  assigned_to?: string;
  estimated_hours?: number;
  actual_hours?: number;
  notes?: string;
  created_by?: string;
  order: number; // Keep order for DnD ranking
  dependency_id?: string;
  order_index: number;
}

export interface ProjectDocument {
  id: string;
  project_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  uploaded_by?: string;
  uploaded_at: string;
  notes?: string;
  gps_coordinates?: string;
}

export interface CostEntry {
  id: string;
  project_id: string;
  amount: number;
  category: string;
  date: string;
  description: string;
}

export type WorkerStatus = 'available' | 'on_project' | 'unavailable' | 'vacation';
export type ContractType = 'daily' | 'CDI' | 'CDD' | 'temporary';

export interface Worker {
  id: string;
  full_name: string;
  cin: string;
  phone: string;
  job_title: string;
  daily_rate: number;
  hourly_rate?: number;
  wilaya: string;
  availability: WorkerStatus;
  photo_url?: string;
  skills?: string;
  emergency_contact?: string;
  date_of_birth?: string;
  contract_type?: ContractType;
  notes?: string;
  created_at?: string;
}

export type EquipmentStatus = 'available' | 'in_use' | 'maintenance' | 'out_of_service';
export type MaintenanceStatus = 'up_to_date' | 'due_soon' | 'overdue';
export type OwnerType = 'company' | 'rented' | 'subcontracted';

export interface Equipment {
  id: string;
  name: string;
  type: string;
  category: string;
  brand: string;
  model: string;
  serial_number: string;
  plate_number?: string;
  year_of_manufacture?: number;
  hourly_rate: number;
  daily_rate: number;
  wilaya: string;
  current_location?: string;
  status: EquipmentStatus;
  owner_type: OwnerType;
  photo_url?: string;
  total_hours_used: number;
  hours_since_last_maintenance: number;
  maintenance_last_date?: string;
  maintenance_next_due?: string;
  maintenance_interval_hours?: number;
  maintenance_interval_days?: number;
  last_maintenance_type?: 'preventive' | 'corrective' | 'major' | 'inspection';
  maintenance_status: MaintenanceStatus;
  maintenance_cost: number;
  next_maintenance_cost_estimate?: number;
  maintenance_notes?: string;
  maintenance_documents?: any;
  warranty_expiry?: string;
  supplier_maintenance_contact?: string;
  created_at?: string;
}

export interface ProjectWorker {
  id: string;
  project_id: string;
  worker_id: string;
  assigned_role: string;
  daily_hours: number;
  start_date: string;
  end_date?: string;
  status: 'active' | 'inactive' | 'completed';
  assigned_at: string;
  worker?: Worker;
}

export interface ProjectEquipment {
  id: string;
  project_id: string;
  equipment_id: string;
  usage_hours_per_day: number;
  assigned_at: string;
  equipment?: Equipment;
}
