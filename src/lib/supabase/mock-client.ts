import { Project, ProjectTask, ProjectStatus, TaskStatus } from "../types/projects";
import { UserProfile, CompanySettings, NotificationSettings, ActiveSession } from "../types/settings";


// Default enhanced Mock Projects
const projectListeners: Set<Listener> = new Set();
const notifyProjectsChanged = () => projectListeners.forEach(l => l());

let mockProjectsDb: Project[] = [
  {
    id: "p-1",
    name: "Lycée 1000 places",
    description: "Construction d'un lycée de 1000 places avec infrastructures sportives.",
    project_type: "school",
    wilaya: "Alger",
    start_date: "2024-01-01",
    expected_end_date: "2026-12-30",
    status: "in_progress",
    budget: 150000000,
    actual_cost: 65000000,
    progress: 45,
    client_name: "Direction de l'Éducation d'Alger",
    contract_number: "CTR-2024-001"
  },
  {
    id: "p-2",
    name: "Revêtement CW 12",
    description: "Travaux de revêtement et d'aménagement du Chemin de Wilaya 12.",
    project_type: "road",
    wilaya: "Mostaganem",
    start_date: "2024-06-15",
    expected_end_date: "2026-05-15",
    status: "delayed",
    budget: 85000000,
    actual_cost: 40000000,
    progress: 20,
    client_name: "Direction des Travaux Publics",
    contract_number: "CTR-2024-002"
  },
  {
    id: "p-3",
    name: "Station d'épuration des eaux",
    description: "Projet de réalisation d'une station d'épuration des eaux usées.",
    project_type: "infrastructure",
    wilaya: "Oran",
    start_date: "2025-01-01",
    expected_end_date: "2027-02-28",
    status: "planning",
    budget: 250000000,
    actual_cost: 0,
    progress: 0,
    client_name: "Algérienne des Eaux",
    contract_number: "CTR-2025-003"
  }
];

let mockWorkersDb: Worker[] = [
  {
    id: "w-1",
    full_name: "Ahmed Mansouri",
    cin: "123456789",
    phone: "0550123456",
    job_title: "Maçon",
    wilaya: "Oran",
    daily_rate: 4500,
    hourly_rate: 450,
    availability: "available",
  },
  {
    id: "w-2",
    full_name: "Mohamed Bouras",
    cin: "987654321",
    phone: "0661987654",
    job_title: "Charpentier",
    wilaya: "Alger",
    daily_rate: 5500,
    hourly_rate: 550,
    availability: "on_project",
  },
  {
    id: "w-3",
    full_name: "Said Hamidi",
    cin: "456123789",
    phone: "0772456123",
    job_title: "Ingénieur Civil",
    wilaya: "Constantine",
    daily_rate: 12000,
    hourly_rate: 1200,
    availability: "available",
  }
];

type Listener = () => void;
const workerListeners: Set<Listener> = new Set();
const notifyWorkersChanged = () => workerListeners.forEach(l => l());

const equipmentListeners: Set<Listener> = new Set();
const notifyEquipmentChanged = () => equipmentListeners.forEach(l => l());

let mockEquipmentDb: Equipment[] = [
  {
    id: "e-1",
    name: "Pelle hydraulique CAT",
    type: "Excavatrice",
    category: "Engins lourds",
    brand: "Caterpillar",
    model: "320D",
    serial_number: "CAT-320D-2023",
    hourly_rate: 2500,
    daily_rate: 25000,
    wilaya: "Oran",
    status: "available",
    owner_type: "company",
    total_hours_used: 1200,
    hours_since_last_maintenance: 150,
    maintenance_status: "up_to_date",
    maintenance_cost: 50000,
  },
  {
    id: "e-2",
    name: "Bétonnière mobile",
    type: "Bétonnière",
    category: "Équipement de chantier",
    brand: "Liebherr",
    model: "HTM 904",
    serial_number: "MIX-500-2024",
    hourly_rate: 800,
    daily_rate: 8000,
    wilaya: "Alger",
    status: "in_use",
    owner_type: "rented",
    total_hours_used: 450,
    hours_since_last_maintenance: 450,
    maintenance_status: "due_soon",
    maintenance_cost: 12000,
  }
];

let mockProjectWorkersDb: ProjectWorker[] = [
  {
    id: "pw-1",
    project_id: "p-1",
    worker_id: "w-2",
    role_ar: "رئيس النجارين",
    role_fr: "Chef Charpentier",
    daily_hours: 8,
    assigned_at: "2024-01-10",
  } as any
];

let mockProjectEquipmentDb: ProjectEquipment[] = [
  {
    id: "pe-1",
    project_id: "p-1",
    equipment_id: "e-2",
    usage_hours_per_day: 6,
    assigned_at: "2024-01-15",
  }
];

let mockProfilesDb: UserProfile[] = [
  {
    id: "u-1",
    full_name: "Ahmed Mansouri",
    email: "ahmed@binaa.dz",
    phone: "0550123456",
    job_title: "Directeur de Projets",
    language: "ar",
    theme: "system",
    profile_picture_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmed"
  }
];

let mockCompanyDb: CompanySettings = {
  id: "c-1",
  company_name: "Binaa Construction EURL",
  logo_url: "https://api.dicebear.com/7.x/initials/svg?seed=BC",
  wilaya: "Alger",
  address: "123 Rue des Frères Bouadou, Bir Mourad Raïs, Alger",
  tax_id: "001234567890123",
  registration_number: "24B0123456",
  phone: "021 12 34 56",
  email: "contact@binaa-construction.dz",
  website: "https://binaa-construction.dz"
};

let mockNotificationSettingsDb: NotificationSettings[] = [
  {
    id: "n-1",
    user_id: "u-1",
    email_notifications: true,
    whatsapp_notifications: false,
    in_app_notifications: true,
    types: {
      new_task_assigned: true,
      project_deadline_approaching: true,
      maintenance_due: true,
      worker_added_to_project: false
    }
  }
];

let mockSessionsDb: ActiveSession[] = [
  {
    id: "s-1",
    device: "MacBook Pro - Chrome",
    location: "Alger, DZ",
    last_active: new Date().toISOString(),
    is_current: true
  },
  {
    id: "s-2",
    device: "iPhone 15 - Safari",
    location: "Oran, DZ",
    last_active: new Date(Date.now() - 86400000).toISOString(),
    is_current: false
  }
];

const settingsListeners: Set<Listener> = new Set();
const notifySettingsChanged = () => settingsListeners.forEach(l => l());

import { Worker, Equipment, ProjectWorker, ProjectEquipment, ProjectDocument } from "../types/projects";

const taskListeners: Set<Listener> = new Set();
const notifyTasksChanged = () => taskListeners.forEach(l => l());

// Default Mock Tasks
let mockTasksDb: ProjectTask[] = [
  {
    id: "t-1",
    project_id: "p-1",
    title: "Préparation du site principal",
    description: "Nettoyage et préparation du terrain pour les fondations.",
    status: "done",
    priority: "high",
    start_date: "2024-01-01",
    due_date: "2024-02-15",
    progress: 100,
    assigned_to: "w-1", // Ahmed Mansouri
    estimated_hours: 120,
    actual_hours: 110,
    order: 0,
    order_index: 0,
  },
  {
    id: "t-2",
    project_id: "p-1",
    title: "Pose des fondations",
    status: "in_progress",
    priority: "urgent",
    start_date: "2024-02-20",
    due_date: "2024-05-30",
    progress: 60,
    assigned_to: "w-2", // Mohamed Bouras
    estimated_hours: 300,
    actual_hours: 180,
    order: 1,
    order_index: 0,
  },
  {
    id: "t-3",
    project_id: "p-1",
    title: "Construction de la structure",
    status: "todo",
    priority: "medium",
    start_date: "2026-06-20",
    due_date: "2024-12-10",
    progress: 0,
    estimated_hours: 500,
    order: 2,
    order_index: 0,
    dependency_id: "t-2"
  }
];

const documentListeners: Set<Listener> = new Set();
const notifyDocumentsChanged = () => documentListeners.forEach(l => l());

// Default Mock Documents
let mockDocumentsDb: ProjectDocument[] = [
  {
    id: "doc-1",
    project_id: "p-1",
    file_name: "plan_architectural_v1.pdf",
    file_url: "https://example.com/plan_architectural_v1.pdf",
    file_type: "pdf",
    uploaded_by: "w-1",
    uploaded_at: "2024-01-15T10:00:00Z",
    notes: "المخطط المعماري الأولي المعتمد."
  },
  {
    id: "doc-2",
    project_id: "p-1",
    file_name: "site_photo_1.jpg",
    file_url: "https://images.unsplash.com/photo-1541888086425-d81bb19240f5?q=80&w=600&auto=format&fit=crop",
    file_type: "image",
    uploaded_by: "w-2",
    uploaded_at: "2024-02-20T14:30:00Z",
    notes: "صورة توثيقية لعمليات وضع الأساسات.",
    gps_coordinates: "36.7525, 3.0419"
  }
];

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

function recalculateProjectProgress(projectId: string) {
  const projectTasks = mockTasksDb.filter(t => t.project_id === projectId);
  if (projectTasks.length === 0) return;
  const totalProgress = projectTasks.reduce((acc, t) => acc + (t.progress || 0), 0);
  const avgProgress = Math.round(totalProgress / projectTasks.length);

  const pIndex = mockProjectsDb.findIndex(p => p.id === projectId);
  if (pIndex !== -1 && mockProjectsDb[pIndex].progress !== avgProgress) {
    mockProjectsDb[pIndex].progress = avgProgress;
    notifyProjectsChanged();
  }
}

export const mockSupabase = {
  projects: {
    subscribe(callback: Listener) {
      projectListeners.add(callback);
      return () => projectListeners.delete(callback);
    },
    async getAll(): Promise<Project[]> {
      await delay(500);
      return [...mockProjectsDb];
    },
    async getById(id: string): Promise<Project | null> {
      await delay(300);
      return mockProjectsDb.find(p => p.id === id) || null;
    },
    async create(project: Omit<Project, 'id'>): Promise<Project> {
      await delay(600);
      const newProject = { ...project, id: `p-${Date.now()}` } as Project;
      mockProjectsDb = [newProject, ...mockProjectsDb];
      notifyProjectsChanged();
      return newProject;
    },
    async update(id: string, updates: Partial<Project>): Promise<Project | null> {
      await delay(400);
      const index = mockProjectsDb.findIndex(p => p.id === id);
      if (index === -1) return null;
      mockProjectsDb[index] = { ...mockProjectsDb[index], ...updates };
      notifyProjectsChanged();
      return mockProjectsDb[index];
    },
    async delete(id: string): Promise<boolean> {
      await delay(400);
      const initialLength = mockProjectsDb.length;
      mockProjectsDb = mockProjectsDb.filter(p => p.id !== id);
      if (mockProjectsDb.length !== initialLength) {
        notifyProjectsChanged();
        return true;
      }
      return false;
    }
  },
  tasks: {
    subscribe(callback: Listener) {
      taskListeners.add(callback);
      return () => taskListeners.delete(callback);
    },
    async getByProjectId(projectId: string): Promise<ProjectTask[]> {
      await delay(400);
      return mockTasksDb.filter(t => t.project_id === projectId).sort((a, b) => a.order - b.order);
    },
    async create(task: Omit<ProjectTask, 'id'>): Promise<ProjectTask> {
      await delay(600);
      const newTask = { ...task, id: `t-${Date.now()}` } as ProjectTask;
      mockTasksDb = [...mockTasksDb, newTask];
      recalculateProjectProgress(newTask.project_id);
      notifyTasksChanged();
      return newTask;
    },
    async update(id: string, updates: Partial<ProjectTask>): Promise<ProjectTask | null> {
      await delay(400);
      const index = mockTasksDb.findIndex(t => t.id === id);
      if (index === -1) return null;
      mockTasksDb[index] = { ...mockTasksDb[index], ...updates };
      recalculateProjectProgress(mockTasksDb[index].project_id);
      notifyTasksChanged();
      return mockTasksDb[index];
    },
    async delete(id: string): Promise<boolean> {
      await delay(300);
      const initialLength = mockTasksDb.length;
      const taskToDelete = mockTasksDb.find(t => t.id === id);
      mockTasksDb = mockTasksDb.filter(t => t.id !== id);
      if (mockTasksDb.length !== initialLength) {
        if (taskToDelete) recalculateProjectProgress(taskToDelete.project_id);
        notifyTasksChanged();
        return true;
      }
      return false;
    },
    async updateStatus(taskId: string, status: TaskStatus): Promise<boolean> {
      await delay(300);
      const index = mockTasksDb.findIndex(t => t.id === taskId);
      if (index === -1) return false;
      mockTasksDb[index].status = status;
      if (status === 'done') mockTasksDb[index].progress = 100;
      if (status === 'todo') mockTasksDb[index].progress = 0;
      recalculateProjectProgress(mockTasksDb[index].project_id);
      notifyTasksChanged();
      return true;
    },
    async updateBulkOrder(updates: { id: string; status: TaskStatus; order: number }[]): Promise<boolean> {
      await delay(300);
      updates.forEach(update => {
        const task = mockTasksDb.find(t => t.id === update.id);
        if (task) {
          task.order = update.order;
          task.status = update.status;
        }
      });
      return true;
    }
  },
  documents: {
    subscribe(callback: Listener) {
      documentListeners.add(callback);
      return () => documentListeners.delete(callback);
    },
    async getByProjectId(projectId: string): Promise<ProjectDocument[]> {
      await delay(400);
      return mockDocumentsDb.filter(d => d.project_id === projectId).sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
    },
    async create(document: Omit<ProjectDocument, 'id'>): Promise<ProjectDocument> {
      await delay(800);
      const newDoc = { ...document, id: `doc-${Date.now()}` } as ProjectDocument;
      mockDocumentsDb = [newDoc, ...mockDocumentsDb];
      notifyDocumentsChanged();
      return newDoc;
    },
    async delete(id: string): Promise<boolean> {
      await delay(500);
      const initialLength = mockDocumentsDb.length;
      mockDocumentsDb = mockDocumentsDb.filter(d => d.id !== id);
      if (mockDocumentsDb.length !== initialLength) {
        notifyDocumentsChanged();
        return true;
      }
      return false;
    }
  },
  workers: {
    subscribe(callback: Listener) {
      workerListeners.add(callback);
      return () => workerListeners.delete(callback);
    },
    async getAll(): Promise<Worker[]> {
      await delay(400);
      return [...mockWorkersDb];
    },
    async create(worker: Omit<Worker, 'id'>): Promise<Worker> {
      await delay(500);
      const newWorker = { ...worker, id: `w-${Date.now()}` } as Worker;
      mockWorkersDb = [newWorker, ...mockWorkersDb];
      notifyWorkersChanged();
      return newWorker;
    },
    async update(id: string, updates: Partial<Worker>): Promise<Worker | null> {
      await delay(300);
      const index = mockWorkersDb.findIndex(w => w.id === id);
      if (index === -1) return null;
      mockWorkersDb[index] = { ...mockWorkersDb[index], ...updates };
      notifyWorkersChanged();
      return mockWorkersDb[index];
    },
    async delete(id: string): Promise<boolean> {
      await delay(300);
      const initialLength = mockWorkersDb.length;
      mockWorkersDb = mockWorkersDb.filter(w => w.id !== id);
      if (mockWorkersDb.length !== initialLength) {
        notifyWorkersChanged();
        return true;
      }
      return false;
    }
  },
  equipment: {
    subscribe(callback: Listener) {
      equipmentListeners.add(callback);
      return () => equipmentListeners.delete(callback);
    },
    async getAll(): Promise<Equipment[]> {
      await delay(400);
      return [...mockEquipmentDb];
    },
    async create(equipment: Omit<Equipment, 'id'>): Promise<Equipment> {
      await delay(500);
      const newEquip = { ...equipment, id: `e-${Date.now()}` } as Equipment;
      mockEquipmentDb = [newEquip, ...mockEquipmentDb];
      notifyEquipmentChanged();
      return newEquip;
    },
    async update(id: string, updates: Partial<Equipment>): Promise<Equipment | null> {
      await delay(300);
      const index = mockEquipmentDb.findIndex(e => e.id === id);
      if (index === -1) return null;
      mockEquipmentDb[index] = { ...mockEquipmentDb[index], ...updates };
      notifyEquipmentChanged();
      return mockEquipmentDb[index];
    },
    async delete(id: string): Promise<boolean> {
      await delay(300);
      const initialLength = mockEquipmentDb.length;
      mockEquipmentDb = mockEquipmentDb.filter(e => e.id !== id);
      if (mockEquipmentDb.length !== initialLength) {
        notifyEquipmentChanged();
        return true;
      }
      return false;
    }
  },
  projectWorkers: {
    async getByProjectId(projectId: string): Promise<ProjectWorker[]> {
      await delay(400);
      return mockProjectWorkersDb
        .filter(pw => pw.project_id === projectId)
        .map(pw => ({
          ...pw,
          worker: mockWorkersDb.find(w => w.id === pw.worker_id)
        }));
    },
    async assign(data: Omit<ProjectWorker, 'id' | 'assigned_at'>): Promise<ProjectWorker> {
      await delay(500);
      const newAssignment = {
        ...data,
        id: `pw-${Date.now()}`,
        assigned_at: new Date().toISOString().split('T')[0]
      } as ProjectWorker;
      mockProjectWorkersDb = [newAssignment, ...mockProjectWorkersDb];
      return newAssignment;
    },
    async remove(id: string): Promise<boolean> {
      await delay(300);
      mockProjectWorkersDb = mockProjectWorkersDb.filter(pw => pw.id !== id);
      return true;
    }
  },
  projectEquipment: {
    async getByProjectId(projectId: string): Promise<ProjectEquipment[]> {
      await delay(400);
      return mockProjectEquipmentDb
        .filter(pe => pe.project_id === projectId)
        .map(pe => ({
          ...pe,
          equipment: mockEquipmentDb.find(e => e.id === pe.equipment_id)
        }));
    },
    async assign(data: Omit<ProjectEquipment, 'id' | 'assigned_at'>): Promise<ProjectEquipment> {
      await delay(500);
      const newAssignment = {
        ...data,
        id: `pe-${Date.now()}`,
        assigned_at: new Date().toISOString().split('T')[0]
      } as ProjectEquipment;
      mockProjectEquipmentDb = [newAssignment, ...mockProjectEquipmentDb];
      return newAssignment;
    },
    async remove(id: string): Promise<boolean> {
      await delay(300);
      mockProjectEquipmentDb = mockProjectEquipmentDb.filter(pe => pe.id !== id);
      return true;
    }
  },
  settings: {
    subscribe(callback: Listener) {
      settingsListeners.add(callback);
      return () => settingsListeners.delete(callback);
    },
    async getProfile(userId: string): Promise<UserProfile | null> {
      await delay(300);
      return mockProfilesDb.find(u => u.id === userId) || mockProfilesDb[0]; // Fallback to first for mock
    },
    async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
      await delay(500);
      const index = mockProfilesDb.findIndex(u => u.id === userId);
      if (index === -1) {
        // For mock, if not found, update the first one
        mockProfilesDb[0] = { ...mockProfilesDb[0], ...updates };
        notifySettingsChanged();
        return mockProfilesDb[0];
      }
      mockProfilesDb[index] = { ...mockProfilesDb[index], ...updates };
      notifySettingsChanged();
      return mockProfilesDb[index];
    },
    async getCompany(): Promise<CompanySettings> {
      await delay(300);
      return { ...mockCompanyDb };
    },
    async updateCompany(updates: Partial<CompanySettings>): Promise<CompanySettings> {
      await delay(500);
      mockCompanyDb = { ...mockCompanyDb, ...updates };
      notifySettingsChanged();
      return { ...mockCompanyDb };
    },
    async getNotifications(userId: string): Promise<NotificationSettings> {
      await delay(300);
      return mockNotificationSettingsDb.find(n => n.user_id === userId) || mockNotificationSettingsDb[0];
    },
    async updateNotifications(userId: string, updates: Partial<NotificationSettings>): Promise<NotificationSettings> {
      await delay(400);
      const index = mockNotificationSettingsDb.findIndex(n => n.user_id === userId);
      if (index === -1) {
        mockNotificationSettingsDb[0] = { ...mockNotificationSettingsDb[0], ...updates };
        notifySettingsChanged();
        return mockNotificationSettingsDb[0];
      }
      mockNotificationSettingsDb[index] = { ...mockNotificationSettingsDb[index], ...updates };
      notifySettingsChanged();
      return mockNotificationSettingsDb[index];
    },
    async getSessions(userId: string): Promise<ActiveSession[]> {
      await delay(300);
      return [...mockSessionsDb];
    }
  }
};
