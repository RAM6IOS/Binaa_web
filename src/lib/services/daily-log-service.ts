import { createClient } from '../supabase/client';
import { DailyLog, CreateDailyLogDto, UpdateDailyLogDto } from '../types/daily-logs';
import type { PostgrestError } from '@supabase/supabase-js';

const supabase = createClient();

function logSupabaseError(context: string, error: PostgrestError) {
  console.error(`${context}:`, error.code, error.message, error.details ?? '');
}

function toDailyLogError(error: PostgrestError, fallback: string): Error {
  if (error.code === '42501') {
    return new Error(
      'Permission denied. Run the daily_logs migration in Supabase SQL Editor (see Daily Logs tab for SQL).'
    );
  }
  if (error.code === '23505') {
    return new Error('A daily log already exists for this date on this project.');
  }
  return new Error(error.message || fallback);
}

function isMissingColumnError(error: PostgrestError) {
  return error.code === 'PGRST204' || error.message?.includes('column');
}

export const dailyLogService = {
  /**
   * جلب جميع التقارير اليومية لمشروع معين
   */
  async getByProjectId(projectId: string): Promise<DailyLog[]> {
    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('project_id', projectId)
      .order('log_date', { ascending: false });

    if (error) {
      console.error('Error fetching daily logs:', error);
      throw error;
    }

    return (data || []).map(row => ({
      ...row,
      workers_present: row.workers_present || [],
      equipment_used: row.equipment_used || [],
      photos: row.photos || [],
    })) as DailyLog[];
  },

  /**
   * جلب تقرير يومي بالمعرّف
   */
  async getById(id: string): Promise<DailyLog | null> {
    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return {
      ...data,
      workers_present: data.workers_present || [],
      equipment_used: data.equipment_used || [],
      photos: data.photos || [],
    } as DailyLog;
  },

  /**
   * إنشاء تقرير يومي جديد
   * يحاول أولاً بالمخطط الكامل — إن لم تكن الأعمدة الجديدة موجودة
   * يعيد المحاولة بالأعمدة الأساسية فقط حتى يُشغَّل الـ migration
   */
  async create(dto: CreateDailyLogDto): Promise<DailyLog> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('You must be logged in to create a daily log.');
    }

    const basePayload = {
      project_id: dto.project_id,
      log_date: dto.log_date,
      weather_condition: dto.weather_condition,
      temperature: dto.temperature,
      work_summary: dto.work_summary,
      notes: dto.notes || null,
      created_by: user.id,
    };

    const fullPayload = {
      ...basePayload,
      problems_faced: dto.problems_faced || null,
      workers_present: dto.workers_present || [],
      equipment_used: dto.equipment_used || [],
      photos: dto.photos || [],
    };

    // محاولة أولى بالمخطط الكامل
    let { data, error } = await supabase
      .from('daily_logs')
      .insert(fullPayload)
      .select()
      .single();

    // إذا كانت الأعمدة غير موجودة بعد (migration لم يُشغَّل بعد)
    // نعيد المحاولة بالأعمدة الأساسية فقط
    if (error && isMissingColumnError(error)) {
      console.warn('[DailyLog] Falling back to base schema — run migration to enable full features.');
      const result = await supabase
        .from('daily_logs')
        .insert(basePayload)
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) {
      logSupabaseError('Error creating daily log', error);
      throw toDailyLogError(error, 'Failed to create daily log');
    }

    return {
      ...data,
      workers_present: data.workers_present || [],
      equipment_used: data.equipment_used || [],
      photos: data.photos || [],
    } as DailyLog;
  },

  /**
   * تحديث تقرير يومي
   */
  async update(id: string, dto: UpdateDailyLogDto): Promise<DailyLog> {
    const baseUpdate: Record<string, any> = {};
    if (dto.log_date !== undefined) baseUpdate.log_date = dto.log_date;
    if (dto.weather_condition !== undefined) baseUpdate.weather_condition = dto.weather_condition;
    if (dto.temperature !== undefined) baseUpdate.temperature = dto.temperature;
    if (dto.work_summary !== undefined) baseUpdate.work_summary = dto.work_summary;
    if (dto.notes !== undefined) baseUpdate.notes = dto.notes;

    const fullUpdate = { ...baseUpdate };
    if (dto.problems_faced !== undefined) fullUpdate.problems_faced = dto.problems_faced;
    if (dto.workers_present !== undefined) fullUpdate.workers_present = dto.workers_present;
    if (dto.equipment_used !== undefined) fullUpdate.equipment_used = dto.equipment_used;
    if (dto.photos !== undefined) fullUpdate.photos = dto.photos;

    // محاولة أولى بالمخطط الكامل
    let { data, error } = await supabase
      .from('daily_logs')
      .update(fullUpdate)
      .eq('id', id)
      .select()
      .single();

    // fallback للأعمدة الأساسية إن لزم
    if (error && isMissingColumnError(error)) {
      console.warn('[DailyLog] Falling back to base schema for update.');
      const result = await supabase
        .from('daily_logs')
        .update(baseUpdate)
        .eq('id', id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) {
      logSupabaseError('Error updating daily log', error);
      throw toDailyLogError(error, 'Failed to update daily log');
    }

    return {
      ...data,
      workers_present: data.workers_present || [],
      equipment_used: data.equipment_used || [],
      photos: data.photos || [],
    } as DailyLog;
  },

  /**
   * حذف تقرير يومي
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('daily_logs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting daily log:', error);
      throw error;
    }
  },

  /**
   * رفع صورة ميدانية إلى Supabase Storage
   * يرمي خطأ إذا لم يكن الـ bucket موجوداً — الـ dialog يتعامل معه بـ fallback
   */
  async uploadPhoto(file: File, projectId: string): Promise<string> {
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `daily-logs/${projectId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    const { data, error } = await supabase.storage
      .from('project-files')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      // نسجّل تحذيراً فقط — الـ dialog لديه fallback لـ object URL
      console.warn('[DailyLog] Storage upload failed (bucket may not exist):', error.message);
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from('project-files')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  },

  /**
   * الاشتراك بالتغييرات في الوقت الفعلي
   */
  subscribe(projectId: string, callback: () => void) {
    const channel = supabase
      .channel(`daily-logs-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_logs',
          filter: `project_id=eq.${projectId}`,
        },
        () => callback()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
