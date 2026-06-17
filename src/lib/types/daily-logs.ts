export type WeatherCondition = 'sunny' | 'rainy' | 'cloudy' | 'stormy' | 'windy' | 'foggy';

export interface DailyLogWorker {
  worker_id: string;
  worker_name: string;
  job_title?: string;
  hours_worked: number;
  status?: 'present' | 'absent' | 'half_day' | 'overtime';
}

export interface DailyLogEquipment {
  equipment_id: string;
  equipment_name: string;
  usage_hours: number;
}

export interface DailyLogPhoto {
  url: string;
  caption?: string;
}

export interface DailyLog {
  id: string;
  project_id: string;
  log_date: string; // YYYY-MM-DD
  weather_condition: WeatherCondition;
  temperature: number; // degrees Celsius
  work_summary: string;
  problems_faced?: string;
  notes?: string;
  workers_present: DailyLogWorker[];
  equipment_used: DailyLogEquipment[];
  photos: DailyLogPhoto[];
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export type CreateDailyLogDto = Omit<DailyLog, 'id' | 'created_at' | 'updated_at'>;
export type UpdateDailyLogDto = Partial<CreateDailyLogDto>;

export interface PointageWorker {
  id?: string;
  pointage_id?: string;
  worker_id: string;
  worker_name?: string; // transient
  job_title?: string; // transient
  status: 'present' | 'absent' | 'half_day' | 'overtime';
  check_in_time?: string | null; // time format "HH:MM:SS" or "HH:MM"
  check_out_time?: string | null; // time format "HH:MM:SS" or "HH:MM"
  break_duration_minutes: number;
  hours_worked: number;
  worker?: {
    full_name: string;
    job_title: string;
  };
}

export interface Pointage {
  id: string;
  project_id: string;
  pointage_date: string; // YYYY-MM-DD
  notes?: string;
  equipment_used: DailyLogEquipment[];
  photos: DailyLogPhoto[];
  pointage_workers: PointageWorker[];
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export type CreatePointageDto = Omit<Pointage, 'id' | 'created_at' | 'updated_at' | 'pointage_workers'> & {
  id?: string;
  pointage_workers: Omit<PointageWorker, 'id' | 'pointage_id'>[];
};

export type UpdatePointageDto = Partial<CreatePointageDto>;

