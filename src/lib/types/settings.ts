export type Language = 'ar' | 'fr';
export type Theme = 'light' | 'dark' | 'system';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  job_title?: string;
  avatar_url?: string;         // Supabase Storage public URL
  profile_picture_url?: string; // legacy alias
  language: Language;
  theme: Theme;
}

export interface CompanySettings {
  id: string;
  company_name: string;
  logo_url?: string;
  wilaya: string;
  address: string;
  tax_id: string; // NIF
  registration_number: string; // RC
  phone: string;
  email: string;
  website?: string;
}

export interface NotificationSettings {
  id: string;
  user_id: string;
  email_notifications: boolean;
  whatsapp_notifications: boolean;
  in_app_notifications: boolean;
  types: {
    new_task_assigned: boolean;
    project_deadline_approaching: boolean;
    maintenance_due: boolean;
    worker_added_to_project: boolean;
  };
}

export interface ActiveSession {
  id: string;
  device: string;
  location: string;
  last_active: string;
  is_current: boolean;
}
