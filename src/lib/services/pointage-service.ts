import { createClient } from '../supabase/client';
import { Pointage, PointageWorker, CreatePointageDto } from '../types/daily-logs';
import type { PostgrestError } from '@supabase/supabase-js';

const supabase = createClient();

function logSupabaseError(context: string, error: PostgrestError) {
  console.error(`${context}:`, error.code, error.message, error.details ?? '');
}

function toPointageError(error: PostgrestError, fallback: string): Error {
  if (error.code === '42501') {
    return new Error(
      'Permission denied. Run the pointage_system migration in Supabase SQL Editor.'
    );
  }
  if (error.code === '23505') {
    return new Error('A pointage already exists for this date on this project.');
  }
  return new Error(error.message || fallback);
}

export const pointageService = {
  /**
   * حساب ساعات العمل تلقائياً استناداً إلى ساعة الدخول، ساعة الخروج، ومدة الاستراحة بالدقائق
   */
  calculateHours(
    checkIn: string | null | undefined,
    checkOut: string | null | undefined,
    breakMinutes: number = 0
  ): number {
    if (!checkIn || !checkOut) return 0;

    // تنسيق المدخلات قد يكون HH:MM أو HH:MM:SS
    const [inH, inM] = checkIn.split(':').map(Number);
    const [outH, outM] = checkOut.split(':').map(Number);

    if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) return 0;

    // حساب الفارق بالدقائق
    const inTotalMinutes = inH * 60 + inM;
    const outTotalMinutes = outH * 60 + outM;

    // التعامل مع الخروج في اليوم التالي إذا كانت ساعة الخروج أصغر من ساعة الدخول
    let diffMinutes = outTotalMinutes - inTotalMinutes;
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60; // إضافة يوم كامل بالدقائق
    }

    const netMinutes = diffMinutes - (breakMinutes || 0);
    const hours = netMinutes / 60;

    // إعادة النتيجة برقم عشري مقرب لمرتبتين
    return Math.max(0, Math.round(hours * 100) / 100);
  },

  /**
   * جلب جميع تسجيلات الحضور للمشروع مع بيانات العمال
   */
  async getByProjectId(projectId: string) {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('daily_pointage')
      .select(`
      *,
      pointage_workers (
        *,
        worker:workers!pointage_workers_worker_id_fkey (
          id,
          full_name,
          job_title,
          photo_url
        )
      ),
      pointage_equipment (
        *,
        equipment:equipment(*)
      )
    `)
      .eq('project_id', projectId)
      .order('pointage_date', { ascending: false });

    if (error) {
      console.error('Error fetching pointages:', error);
      throw error;
    }

    // Map nested worker relation into flat worker_name / job_title fields
    return (data || []).map((p: any) => ({
      ...p,
      pointage_workers: (p.pointage_workers || []).map((pw: any) => ({
        ...pw,
        worker_name: pw.worker?.full_name || '',
        job_title: pw.worker?.job_title || ''
      })),
      equipment_used: (p.pointage_equipment || []).map((pe: any) => ({
        equipment_id: pe.equipment_id,
        equipment_name: pe.equipment?.name || '',
        usage_hours: pe.usage_hours || 0
      }))
    }));
  },

  /**
   * جلب تسجيل حضور لليوم بالمعرّف مع بيانات العمال
   */
  async getById(id: string): Promise<Pointage | null> {
    const { data, error } = await supabase
      .from('daily_pointage')
      .select(`
        *,
        pointage_workers (
          *,
          worker:workers!pointage_workers_worker_id_fkey (
  id, full_name, job_title, photo_url
)
        ),
        pointage_equipment (*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching pointage by id:', error);
      throw error;
    }

    return {
      ...data,
      pointage_workers: (data.pointage_workers || []).map((pw: any) => ({
        ...pw,
        worker_name: pw.worker?.full_name || '',
        job_title: pw.worker?.job_title || ''
      }))
    } as Pointage;
  },

  /**
   * جلب تسجيل حضور لمشروع وتاريخ محدد مع تفاصيل الربط (Joins) الكاملة للعمال
   */
  /**
  * جلب تسجيل حضور لمشروع وتاريخ محدد
  */
  async getPointageByDate(projectId: string, date: string): Promise<Pointage | null> {
    const { data, error } = await supabase
      .from('daily_pointage')
      .select(`
        *,
        pointage_workers (
          *,
          worker:workers!pointage_workers_worker_id_fkey (
  id, full_name, job_title, photo_url
)
        ),
        pointage_equipment (*)
      `)
      .eq('project_id', projectId)
      .eq('pointage_date', date)
      .maybeSingle();

    if (error) {
      console.error('Error fetching pointage by date:', error);
      throw error;
    }

    if (!data) return null;

    return {
      ...data,
      pointage_workers: (data.pointage_workers || []).map((pw: any) => ({
        ...pw,
        worker_name: pw.worker?.full_name || '',
        job_title: pw.worker?.job_title || ''
      }))
    } as Pointage;
  },
  /**
   * إضافة حضور لعامل منفرد (دعم check_in_time و check_out_time)
   */
  async addWorker(
    pointageId: string,
    workerAttendance: Omit<PointageWorker, 'id' | 'pointage_id'>
  ): Promise<PointageWorker> {
    // حساب الساعات تلقائياً إذا توفرت الأوقات
    const hours = this.calculateHours(
      workerAttendance.check_in_time,
      workerAttendance.check_out_time,
      workerAttendance.break_duration_minutes
    );

    const payload = {
      pointage_id: pointageId,
      worker_id: workerAttendance.worker_id,
      status: workerAttendance.status,
      check_in_time: workerAttendance.check_in_time || null,
      check_out_time: workerAttendance.check_out_time || null,
      break_duration_minutes: workerAttendance.break_duration_minutes || 0,
      hours_worked: workerAttendance.hours_worked !== undefined ? workerAttendance.hours_worked : hours,
    };

    const { data, error } = await supabase
      .from('pointage_workers')
      .insert(payload)
      .select()
      .single();

    if (error) {
      logSupabaseError('Error adding worker pointage', error);
      throw error;
    }

    return data as PointageWorker;
  },

  /**
   * حفظ تسجيل حضور كامل (الرأس والتفاصيل للعمال)
   */
  async save(dto: CreatePointageDto): Promise<Pointage> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('You must be logged in to save pointage.');
    }

    // تحقق من تسجيل حضور قائم لنفس التاريخ
    const existing = await this.getPointageByDate(dto.project_id, dto.pointage_date);
    const pointageId = dto.id || existing?.id;

    const pointageHeader = {
      project_id: dto.project_id,
      pointage_date: dto.pointage_date,
      notes: dto.notes || null,
      equipment_used: dto.equipment_used || [],
      photos: dto.photos || [],
      updated_at: new Date().toISOString()
    };

    let finalPointageId = pointageId;

    if (pointageId) {
      // تحديث الرأس
      const { error } = await supabase
        .from('daily_pointage')
        .update(pointageHeader)
        .eq('id', pointageId);

      if (error) {
        logSupabaseError('Error updating pointage header', error);
        throw toPointageError(error, 'Failed to update pointage');
      }

      // حذف تفاصيل العمال الحالية لإعادة إضافتهم (Delete-and-Insert Pattern)
      const { error: deleteError } = await supabase
        .from('pointage_workers')
        .delete()
        .eq('pointage_id', pointageId);

      if (deleteError) {
        logSupabaseError('Error clearing pointage workers', deleteError);
        throw deleteError;
      }
    } else {
      // إنشاء رأس جديد
      const { data, error } = await supabase
        .from('daily_pointage')
        .insert({
          ...pointageHeader,
          created_by: user.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        logSupabaseError('Error creating pointage header', error);
        throw toPointageError(error, 'Failed to create pointage');
      }

      finalPointageId = data.id;
    }

    // إدخال تفاصيل عمال الحضور الجدد
    if (dto.pointage_workers && dto.pointage_workers.length > 0) {
      const workersPayload = dto.pointage_workers.map(w => {
        // حساب ساعات العمل التلقائي
        const calculatedHours = this.calculateHours(w.check_in_time, w.check_out_time, w.break_duration_minutes);
        return {
          pointage_id: finalPointageId,
          worker_id: w.worker_id,
          status: w.status,
          check_in_time: w.check_in_time || null,
          check_out_time: w.check_out_time || null,
          break_duration_minutes: w.break_duration_minutes || 0,
          hours_worked: w.hours_worked !== undefined && w.status === 'overtime' ? w.hours_worked : (w.status === 'absent' ? 0 : calculatedHours || w.hours_worked || 8.0)
        };
      });

      const { error: insertWorkersError } = await supabase
        .from('pointage_workers')
        .insert(workersPayload);

      if (insertWorkersError) {
        logSupabaseError('Error inserting pointage workers', insertWorkersError);
        throw insertWorkersError;
      }
    }

    // محاولة مزامنة تسجيل الحضور كتقرير يومي (Daily Log)
    try {
      await this.syncToDailyLog(finalPointageId!);
    } catch (syncErr) {
      console.warn('[Pointage Sync] Could not sync to daily logs table:', syncErr);
    }

    // جلب وحفظ النتيجة النهائية بالربط
    const result = await this.getById(finalPointageId!);
    if (!result) throw new Error('Failed to retrieve saved pointage');
    return result;
  },

  /**
   * مزامنة حضور العمال والعتاد مع جدول daily_logs إذا كان متوفراً
   */
  async syncToDailyLog(pointageId: string): Promise<void> {
    const pointage = await this.getById(pointageId);
    if (!pointage) return;

    // تحقق مما إذا كان هناك تقرير يومي لنفس التاريخ
    const { data: existingLog } = await supabase
      .from('daily_logs')
      .select('id')
      .eq('project_id', pointage.project_id)
      .eq('log_date', pointage.pointage_date)
      .maybeSingle();

    // تجهيز مصفوفة العمال بتنسيق JSON لـ daily_logs
    const workersPresentJson = pointage.pointage_workers.map(pw => ({
      worker_id: pw.worker_id,
      worker_name: pw.worker_name,
      job_title: pw.job_title,
      hours_worked: pw.hours_worked,
      status: pw.status
    }));

    const logPayload = {
      project_id: pointage.project_id,
      log_date: pointage.pointage_date,
      workers_present: workersPresentJson,
      equipment_used: pointage.equipment_used,
      photos: pointage.photos,
      notes: pointage.notes,
      work_summary: 'تسجيل الحضور اليومي للمشروع (تحديث تلقائي)',
      weather_condition: 'sunny',
      temperature: 25
    };

    if (existingLog) {
      await supabase
        .from('daily_logs')
        .update({
          workers_present: workersPresentJson,
          equipment_used: pointage.equipment_used,
          photos: pointage.photos,
          notes: pointage.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLog.id);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from('daily_logs')
        .insert({
          ...logPayload,
          created_by: user?.id,
          created_at: new Date().toISOString()
        });
    }
  },

  /**
   * حذف تسجيل حضور كامل
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('daily_pointage')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting pointage:', error);
      throw error;
    }
  },

  /**
   * رفع صورة مرفقة
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
      console.warn('[Pointage] Storage upload failed:', error.message);
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from('project-files')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  },

  /**
   * الاشتراك بالتغيرات الفورية
   */
  subscribe(projectId: string, callback: () => void) {
    const channel = supabase
      .channel(`daily-pointage-channel-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_pointage',
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
