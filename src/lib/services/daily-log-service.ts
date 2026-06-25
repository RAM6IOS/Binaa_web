import { createClient } from '../supabase/client';
import { DailyLog, CreateDailyLogDto, UpdateDailyLogDto } from '../types/daily-logs';
import type { PostgrestError } from '@supabase/supabase-js';

const supabase = createClient();

function logSupabaseError(context: string, error: PostgrestError) {
  console.error(`${context}:`, error.code, error.message, error.details ?? '');
}

function toDailyLogError(error: PostgrestError, fallback: string): Error {
  if (error.code === '42501') {
    return new Error('Permission denied. Run the daily_logs migration in Supabase SQL Editor.');
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
  async getByProjectId(projectId: string): Promise<DailyLog[]> {
    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('project_id', projectId)
      .order('log_date', { ascending: false });

    if (error) {
      logSupabaseError('Error fetching daily logs', error);
      throw error;
    }

    return (data || []).map(row => ({
      ...row,
      workers_present: row.workers_present || [],
      equipment_used: row.equipment_used || [],
      quantities: row.quantities || [],
      materials: row.materials || [],
      photos: row.photos || [],
    })) as DailyLog[];
  },

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
      quantities: data.quantities || [],
      materials: data.materials || [],
      photos: data.photos || [],
    } as DailyLog;
  },

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
      overall_progress: dto.overall_progress ?? 0,
      created_by: user.id,
    };

    const fullPayload = {
      ...basePayload,
      problems_faced: dto.problems_faced || null,
      workers_present: dto.workers_present || [],
      equipment_used: dto.equipment_used || [],
      quantities: dto.quantities || [],
      materials: dto.materials || [],
      photos: dto.photos || [],
    };

    let { data, error } = await supabase
      .from('daily_logs')
      .insert(fullPayload)
      .select()
      .single();

    // Fallback للأعمدة القديمة
    if (error && isMissingColumnError(error)) {
      console.warn('[DailyLog] Falling back to base schema — please run the latest migration.');
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
      quantities: data.quantities || [],
      materials: data.materials || [],
      photos: data.photos || [],
    } as DailyLog;
  },

  async update(id: string, dto: UpdateDailyLogDto): Promise<DailyLog> {
    const baseUpdate: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.log_date !== undefined) baseUpdate.log_date = dto.log_date;
    if (dto.weather_condition !== undefined) baseUpdate.weather_condition = dto.weather_condition;
    if (dto.temperature !== undefined) baseUpdate.temperature = dto.temperature;
    if (dto.work_summary !== undefined) baseUpdate.work_summary = dto.work_summary;
    if (dto.notes !== undefined) baseUpdate.notes = dto.notes;
    if (dto.overall_progress !== undefined) baseUpdate.overall_progress = dto.overall_progress;

    const fullUpdate = { ...baseUpdate };
    if (dto.problems_faced !== undefined) fullUpdate.problems_faced = dto.problems_faced;
    if (dto.workers_present !== undefined) fullUpdate.workers_present = dto.workers_present;
    if (dto.equipment_used !== undefined) fullUpdate.equipment_used = dto.equipment_used;
    if (dto.quantities !== undefined) fullUpdate.quantities = dto.quantities;
    if (dto.materials !== undefined) fullUpdate.materials = dto.materials;
    if (dto.photos !== undefined) fullUpdate.photos = dto.photos;

    let { data, error } = await supabase
      .from('daily_logs')
      .update(fullUpdate)
      .eq('id', id)
      .select()
      .single();

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
      quantities: data.quantities || [],
      materials: data.materials || [],
      photos: data.photos || [],
    } as DailyLog;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('daily_logs')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async uploadPhoto(file: File, projectId: string): Promise<string> {
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `daily-logs/${projectId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    const { data, error } = await supabase.storage
      .from('project-files')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (error) {
      console.warn('[DailyLog] Storage upload failed:', error.message);
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from('project-files')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  },

  subscribe(projectId: string, callback: () => void) {
    const channel = supabase
      .channel(`daily-logs-${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_logs', filter: `project_id=eq.${projectId}` },
        () => callback()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  },
  /**
 * تصدير التقرير اليومي إلى PDF (شكل رسمي مشابه لـ "Situation des Travaux")
 */
  async generatePDF(log: DailyLog, isAr: boolean = true): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // العنوان
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(isAr ? "تقرير يومي للأشغال" : "Rapport Journalier des Travaux", pageWidth / 2, y, { align: "center" });
    y += 10;

    doc.setFontSize(12);
    doc.text(`التاريخ: ${log.log_date}`, 20, y);
    y += 8;
    doc.text(`درجة الحرارة: ${log.temperature}°C`, 20, y);
    y += 8;
    doc.text(`الطقس: ${log.weather_condition}`, 20, y);
    y += 15;

    // ملخص الأعمال
    doc.setFont("helvetica", "bold");
    doc.text(isAr ? "ملخص الأعمال:" : "Résumé des travaux:", 20, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    const summaryLines = doc.splitTextToSize(log.work_summary, 170);
    doc.text(summaryLines, 20, y);
    y += summaryLines.length * 6 + 10;

    // الكميات
    if (log.quantities && log.quantities.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.text(isAr ? "الكميات المنجزة:" : "Quantités réalisées:", 20, y);
      y += 8;
      doc.setFont("helvetica", "normal");

      log.quantities.forEach(q => {
        const line = `${q.description} : ${q.achieved_quantity} ${q.unit}`;
        doc.text(line, 25, y);
        y += 7;
      });
      y += 5;
    }

    // المواد
    if (log.materials && log.materials.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.text(isAr ? "المواد المستهلكة:" : "Matériaux consommés:", 20, y);
      y += 8;
      doc.setFont("helvetica", "normal");

      log.materials.forEach(m => {
        const line = `${m.material_name} : ${m.quantity} ${m.unit}`;
        doc.text(line, 25, y);
        y += 7;
      });
    }

    // Footer
    doc.setFontSize(10);
    doc.text(isAr ? "منصة بناء - تقرير يومي" : "Binaa Platform - Rapport Journalier", pageWidth / 2, 280, { align: "center" });

    // حفظ الملف
    const fileName = `تقرير_${log.log_date}.pdf`;
    doc.save(fileName);
  },
};