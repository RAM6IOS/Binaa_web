export type WeatherCondition = 'sunny' | 'rainy' | 'cloudy' | 'stormy' | 'windy' | 'foggy';

export interface DailyLogWorker {
  worker_id: string;
  worker_name: string;
  job_title?: string;
  hours_worked: number;
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
