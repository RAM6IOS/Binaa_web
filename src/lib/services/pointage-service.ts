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
    return new Error('A pointage already exists for this date on this project/location.');
  }
  return new Error(error.message || fallback);
}

export const pointageService = {
  /**
   * حساب ساعات العمل تلقائياً استناداً إلى ساعة الدخول، ساعة الخروج، ومدة الاستراحة بالدقائق.
   * يدعم تنسيقات متنوعة (HH:MM أو HH:MM:SS) وتغيير اليوم (الخروج في اليوم التالي).
   */
  calculateHours(
    checkIn: string | null | undefined,
    checkOut: string | null | undefined,
    breakMinutes: number = 0
  ): number {
    if (!checkIn || !checkOut) return 0;

    try {
      // استخراج الساعات والدقائق
      const [inH, inM] = checkIn.split(':').map(Number);
      const [outH, outM] = checkOut.split(':').map(Number);

      if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) return 0;

      // تحويل كامل الوقت إلى دقائق
      const inTotalMinutes = inH * 60 + inM;
      const outTotalMinutes = outH * 60 + outM;

      // التعامل مع حالة خروج العامل في اليوم التالي
      let diffMinutes = outTotalMinutes - inTotalMinutes;
      if (diffMinutes < 0) {
        diffMinutes += 24 * 60; // إضافة 24 ساعة بالدقائق
      }

      // طرح مدة الاستراحة وتفادي القيم السالبة
      const netMinutes = Math.max(0, diffMinutes - (breakMinutes || 0));
      const hours = netMinutes / 60;

      // تقريب الساعات لأقرب خانتين عشريتين
      return Math.max(0, Math.round(hours * 100) / 100);
    } catch (e) {
      console.error('Error calculating hours:', e);
      return 0;
    }
  },

  /**
   * جلب جميع تسجيلات الحضور مع إمكانية التصفية حسب المشروع (متوافق مع الكود القديم)
   */
  async getByProjectId(projectId: string) {
    return this.getAll(projectId);
  },

  /**
   * جلب جميع تسجيلات الحضور مع تصفية اختيارية حسب المعرف
   */
  async getAll(projectId?: string) {
    return this.getAllPointages({ projectId });
  },

  /**
   * دالة متطورة وموحدة لجلب جميع تسجيلات الحضور مع خيارات تصفية متعددة
   */
  async getAllPointages(filters?: { projectId?: string; location?: string; limit?: number }) {
    const supabase = createClient();

    let query = supabase
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
      .order('pointage_date', { ascending: false });

    if (filters?.projectId) {
      query = query.eq('project_id', filters.projectId);
    }
    if (filters?.location) {
      query = query.eq('location', filters.location);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching pointages in getAllPointages:', error);
      throw error;
    }

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
   * جلب تسجيلات الحضور لنطاق تاريخي (جدولة أسبوعية)
   */
  async getWeekPointages(
    startDate: string,
    endDate: string,
    projectId?: string
  ) {
    const supabase = createClient();

    let query = supabase
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
        )
      `)
      .gte('pointage_date', startDate)
      .lte('pointage_date', endDate)
      .order('pointage_date', { ascending: true });

    if (projectId && projectId !== 'all') {
      if (projectId === 'general') {
        query = query.is('project_id', null);
      } else {
        query = query.eq('project_id', projectId);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching week pointages:', error);
      throw error;
    }

    return (data || []).map((p: any) => ({
      ...p,
      pointage_workers: (p.pointage_workers || []).map((pw: any) => ({
        ...pw,
        worker_name: pw.worker?.full_name || '',
        job_title: pw.worker?.job_title || '',
        photo_url: pw.worker?.photo_url || null,
      })),
    }));
  },

  /**
   * جلب تسجيلات حضور اليوم للوضع العام أو المشروعات المفتوحة
   */
  async getTodayPointages() {
    const today = new Date().toISOString().split('T')[0];
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
        )
      `)
      .eq('pointage_date', today)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching today pointages:', error);
      throw error;
    }

    return (data || []).map((p: any) => ({
      ...p,
      pointage_workers: (p.pointage_workers || []).map((pw: any) => ({
        ...pw,
        worker_name: pw.worker?.full_name || '',
        job_title: pw.worker?.job_title || ''
      }))
    }));
  },

  /**
   * جلب تسجيل حضور بالمعرّف مع بيانات العمال
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
   * جلب تسجيل حضور لمشروع/موقع وتاريخ محدد
   */
  async getPointageByDate(date: string, projectId?: string, location?: string): Promise<Pointage | null> {
    let query = supabase
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
      .eq('pointage_date', date);

    if (projectId) {
      query = query.eq('project_id', projectId);
    } else if (location) {
      query = query.eq('location', location).is('project_id', null);
    } else {
      query = query.is('project_id', null);
    }

    const { data, error } = await query.maybeSingle();

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
   * تسجيل دخول سريع لعامل (Clock In)
   */
  async clockIn(
    workerId: string,
    options?: { projectId?: string; location?: string; notes?: string }
  ): Promise<PointageWorker> {
    const today = new Date().toISOString().split('T')[0];
    // صيغة الوقت HH:MM
    const nowTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    // 1. جلب أو إنشاء رأس الحضور لليوم والموقع/المشروع المحدد
    let pointage = await this.getPointageByDate(today, options?.projectId, options?.location);
    
    if (!pointage) {
      const { data: { user } } = await supabase.auth.getUser();
      const pointageHeader = {
        project_id: options?.projectId || null,
        location: options?.location || null,
        pointage_date: today,
        notes: options?.notes || null,
        created_by: user?.id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('daily_pointage')
        .insert(pointageHeader)
        .select()
        .single();
        
      if (error) {
        logSupabaseError('Error creating pointage header in clockIn', error);
        throw error;
      }
      pointage = data;
    }

    // 2. التحقق من وجود العامل مسجلاً مسبقاً في تفاصيل هذا الحضور
    const { data: existingWorker, error: workerError } = await supabase
      .from('pointage_workers')
      .select('*')
      .eq('pointage_id', pointage!.id)
      .eq('worker_id', workerId)
      .maybeSingle();

    if (workerError) {
      logSupabaseError('Error finding worker in clockIn', workerError);
      throw workerError;
    }

    if (existingWorker) {
      // إذا لم يكن وقت الدخول مسجلاً، نقوم بتحديثه
      if (!existingWorker.check_in_time) {
        const { data: updated, error: updateError } = await supabase
          .from('pointage_workers')
          .update({ check_in_time: nowTime, status: 'present' })
          .eq('id', existingWorker.id)
          .select()
          .single();
        if (updateError) throw updateError;
        return updated as PointageWorker;
      }
      return existingWorker as PointageWorker;
    }

    // 3. إضافة سجل حضور جديد للعامل
    const payload = {
      pointage_id: pointage!.id,
      worker_id: workerId,
      status: 'present',
      check_in_time: nowTime,
      check_out_time: null,
      break_duration_minutes: 0,
      hours_worked: 0
    };

    const { data, error: insertError } = await supabase
      .from('pointage_workers')
      .insert(payload)
      .select()
      .single();

    if (insertError) {
      logSupabaseError('Error inserting worker pointage in clockIn', insertError);
      throw insertError;
    }

    return data as PointageWorker;
  },

  /**
   * تسجيل خروج سريع لعامل (Clock Out) مع حساب الساعات تلقائياً
   */
  async clockOut(
    workerId: string,
    options?: { projectId?: string; location?: string }
  ): Promise<PointageWorker> {
    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    // 1. جلب جلسة الحضور
    const pointage = await this.getPointageByDate(today, options?.projectId, options?.location);
    if (!pointage) {
      throw new Error('No pointage session found for today.');
    }

    // 2. البحث عن العامل في الجلسة الحالية
    const { data: existingWorker, error: workerError } = await supabase
      .from('pointage_workers')
      .select('*')
      .eq('pointage_id', pointage.id)
      .eq('worker_id', workerId)
      .maybeSingle();

    if (workerError) {
      logSupabaseError('Error finding worker in clockOut', workerError);
      throw workerError;
    }

    if (!existingWorker) {
      throw new Error('Worker has not clocked in today.');
    }

    // 3. حساب ساعات العمل وتحديث السجل
    const checkIn = existingWorker.check_in_time;
    const hours = this.calculateHours(checkIn, nowTime, existingWorker.break_duration_minutes || 0);

    const { data: updated, error: updateError } = await supabase
      .from('pointage_workers')
      .update({
        check_out_time: nowTime,
        hours_worked: hours,
      })
      .eq('id', existingWorker.id)
      .select()
      .single();

    if (updateError) {
      logSupabaseError('Error updating worker in clockOut', updateError);
      throw updateError;
    }

    // مزامنة التقرير اليومي إذا كان الحضور مرتبطاً بمشروع
    if (pointage.project_id) {
      try {
        await this.syncToDailyLog(pointage.id);
      } catch (syncErr) {
        console.warn('[Pointage Sync] Clock out sync failed:', syncErr);
      }
    }

    return updated as PointageWorker;
  },

  /**
   * تحديث أو إضافة وردية لعامل في يوم محدد
   */
  async upsertWorkerShift(params: {
    date: string;
    workerId: string;
    projectId?: string | null;
    location?: string | null;
    status: PointageWorker['status'];
    checkIn?: string | null;
    checkOut?: string | null;
    breakMinutes?: number;
  }): Promise<PointageWorker> {
    let pointage = await this.getPointageByDate(
      params.date,
      params.projectId ?? undefined,
      params.location ?? undefined
    );

    if (!pointage) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('daily_pointage')
        .insert({
          project_id: params.projectId || null,
          location: params.location || null,
          pointage_date: params.date,
          created_by: user?.id || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        logSupabaseError('Error creating pointage header in upsertWorkerShift', error);
        throw error;
      }
      pointage = { ...data, pointage_workers: [] } as Pointage;
    }

    const breakMin = params.breakMinutes || 0;
    let hours = 0;
    if (params.status !== 'absent') {
      hours = this.calculateHours(params.checkIn, params.checkOut, breakMin);
      if (hours === 0) {
        if (params.status === 'half_day') hours = 4;
        else if (params.status === 'overtime') hours = 10;
        else hours = 8;
      }
    }

    const payload = {
      status: params.status,
      check_in_time: params.status === 'absent' ? null : (params.checkIn || null),
      check_out_time: params.status === 'absent' ? null : (params.checkOut || null),
      break_duration_minutes: breakMin,
      hours_worked: hours,
    };

    const existing = (pointage.pointage_workers || []).find(
      (pw) => pw.worker_id === params.workerId
    );

    if (existing?.id) {
      const { data, error } = await supabase
        .from('pointage_workers')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) {
        logSupabaseError('Error updating worker shift', error);
        throw error;
      }

      if (pointage.project_id) {
        try {
          await this.syncToDailyLog(pointage.id);
        } catch (syncErr) {
          console.warn('[Pointage Sync] upsertWorkerShift sync failed:', syncErr);
        }
      }

      return data as PointageWorker;
    }

    const result = await this.addWorker(pointage.id, {
      worker_id: params.workerId,
      ...payload,
    });

    if (pointage.project_id) {
      try {
        await this.syncToDailyLog(pointage.id);
      } catch (syncErr) {
        console.warn('[Pointage Sync] upsertWorkerShift sync failed:', syncErr);
      }
    }

    return result;
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
  async save(dto: any): Promise<Pointage> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('You must be logged in to save pointage.');
    }

    // تحقق من تسجيل حضور قائم لنفس التاريخ (والمشروع/الموقع)
    const existing = await this.getPointageByDate(dto.pointage_date, dto.project_id, dto.location);
    const pointageId = dto.id || existing?.id;

    const pointageHeader = {
      project_id: dto.project_id || null,
      location: dto.location || null,
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
      const workersPayload = dto.pointage_workers.map((w: any) => {
        // حساب ساعات العمل التلقائي
        const calculatedHours = this.calculateHours(w.check_in_time, w.check_out_time, w.break_duration_minutes);
        
        let finalHours = 0;
        if (w.status === 'absent') {
          finalHours = 0;
        } else if (w.hours_worked !== undefined && w.hours_worked !== null) {
          finalHours = w.hours_worked;
        } else if (calculatedHours > 0) {
          finalHours = calculatedHours;
        } else {
          finalHours = 8.0; // افتراضي إذا لم يتوفر أي شيء
        }

        return {
          pointage_id: finalPointageId,
          worker_id: w.worker_id,
          status: w.status,
          check_in_time: w.check_in_time || null,
          check_out_time: w.check_out_time || null,
          break_duration_minutes: w.break_duration_minutes || 0,
          hours_worked: finalHours
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

    // محاولة مزامنة تسجيل الحضور كتقرير يومي (Daily Log) إذا كان تابعاً لمشروع
    if (dto.project_id) {
      try {
        await this.syncToDailyLog(finalPointageId!);
      } catch (syncErr) {
        console.warn('[Pointage Sync] Could not sync to daily logs table:', syncErr);
      }
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
    if (!pointage || !pointage.project_id) return;

    // تحقق مما إذا كان هناك تقرير يومي لنفس التاريخ
    const { data: existingLog } = await supabase
      .from('daily_logs')
      .select('id')
      .eq('project_id', pointage.project_id)
      .eq('log_date', pointage.pointage_date)
      .maybeSingle();

    // تجهيز مصفوفة العمال بتنسيق JSON لـ daily_logs
    const workersPresentJson = pointage.pointage_workers.map((pw: any) => ({
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
  async uploadPhoto(file: File, projectId?: string): Promise<string> {
    const ext = file.name.split('.').pop() || 'jpg';
    const folder = projectId ? `daily-logs/${projectId}` : `daily-logs/general`;
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

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
  subscribe(callback: () => void, projectId?: string) {
    let filter = undefined;
    if (projectId) {
      filter = `project_id=eq.${projectId}`;
    }

    const channelName = projectId ? `daily-pointage-channel-${projectId}` : `daily-pointage-channel-general`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_pointage',
          filter: filter,
        },
        () => callback()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
