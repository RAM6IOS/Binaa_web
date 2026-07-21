import { createClient } from '../supabase/client';
import { DailyLog, CreateDailyLogDto, UpdateDailyLogDto } from '../types/daily-logs';
import type { PostgrestError } from '@supabase/supabase-js';
import { db } from '../db/offline-db';
import { checkNetworkStatus } from '../utils/network';

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

async function syncProjectProgress(projectId: string, progress: number) {
  if (progress <= 0) return;
  try {
    await supabase
      .from('projects')
      .update({ progress, updated_at: new Date().toISOString() })
      .eq('id', projectId);
  } catch (err) {
    console.warn('[DailyLog] Failed to sync project progress:', err);
  }
}

export const dailyLogService = {
  async getByProjectId(projectId: string): Promise<DailyLog[]> {
    const isOnline = await checkNetworkStatus();

    if (isOnline) {
      try {
        const { data, error } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('project_id', projectId)
          .order('log_date', { ascending: false });

        if (error) {
          logSupabaseError('Error fetching daily logs', error);
          throw error;
        }

        const logs = (data || []).map(row => ({
          ...row,
          workers_present: row.workers_present || [],
          equipment_used: row.equipment_used || [],
          quantities: row.quantities || [],
          materials: row.materials || [],
          photos: row.photos || [],
        })) as DailyLog[];

        // Cache locally (delete old ones and store the fresh ones)
        await db.daily_logs.where('project_id').equals(projectId).delete();
        if (logs.length > 0) {
          await db.daily_logs.bulkPut(logs);
        }

        return logs;
      } catch (err) {
        console.warn('[DailyLogService] Error fetching from Supabase, falling back to local DB:', err);
      }
    }

    // Offline or network error fallback
    const localLogs = await db.daily_logs
      .where('project_id')
      .equals(projectId)
      .toArray();

    return localLogs.sort((a, b) => b.log_date.localeCompare(a.log_date));
  },

  async getById(id: string): Promise<DailyLog | null> {
    const isOnline = await checkNetworkStatus();

    if (isOnline) {
      try {
        const { data, error } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') return null;
          throw error;
        }

        const log = {
          ...data,
          workers_present: data.workers_present || [],
          equipment_used: data.equipment_used || [],
          quantities: data.quantities || [],
          materials: data.materials || [],
          photos: data.photos || [],
        } as DailyLog;

        // Cache locally
        await db.daily_logs.put(log);
        return log;
      } catch (err) {
        console.warn('[DailyLogService] Error fetching log by ID, falling back to local DB:', err);
      }
    }

    return (await db.daily_logs.get(id)) || null;
  },

  async create(dto: CreateDailyLogDto): Promise<DailyLog> {
    let userId: string | undefined;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      userId = session.user.id;
    } else {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!authError && user) {
        userId = user.id;
      }
    }

    if (!userId) {
      throw new Error('You must be logged in to create a daily log.');
    }

    const isOnline = await checkNetworkStatus();

    if (isOnline) {
      const basePayload = {
        project_id: dto.project_id,
        log_date: dto.log_date,
        weather_condition: dto.weather_condition,
        temperature: dto.temperature,
        temperature_min: dto.temperature_min ?? null,
        site_status: dto.site_status || 'active',
        work_summary: dto.work_summary,
        notes: dto.notes || null,
        overall_progress: dto.overall_progress ?? 0,
        created_by: userId,
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

      const createdLog = {
        ...data,
        workers_present: data.workers_present || [],
        equipment_used: data.equipment_used || [],
        quantities: data.quantities || [],
        materials: data.materials || [],
        photos: data.photos || [],
      } as DailyLog;

      await db.daily_logs.put(createdLog);

      // ربط نسبة التقدم مع المشروع
      if (createdLog.overall_progress > 0) {
        await syncProjectProgress(dto.project_id, createdLog.overall_progress);
      }

      return createdLog;
    }

    // Offline Mode: Generate client UUID and queue sync
    const logId = crypto.randomUUID();
    const offlineLog: DailyLog = {
      id: logId,
      project_id: dto.project_id,
      log_date: dto.log_date,
      weather_condition: dto.weather_condition,
      temperature: dto.temperature,
      temperature_min: dto.temperature_min,
      site_status: dto.site_status || 'active',
      work_summary: dto.work_summary,
      problems_faced: dto.problems_faced || undefined,
      notes: dto.notes || undefined,
      overall_progress: dto.overall_progress ?? 0,
      status: dto.status || 'draft',
      location_details: dto.location_details || undefined,
      estimated_value: dto.estimated_value ?? 0,
      workers_present: dto.workers_present || [],
      equipment_used: dto.equipment_used || [],
      quantities: dto.quantities || [],
      materials: dto.materials || [],
      photos: dto.photos || [],
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.daily_logs.put(offlineLog);

    await db.queue.add({
      table: 'daily_logs',
      action: 'create',
      targetId: logId,
      payload: offlineLog,
      createdAt: Date.now(),
    });

    // ربط نسبة التقدم مع المشروع (محلياً)
    if (offlineLog.overall_progress > 0) {
      const existingProject = await db.projects.get(dto.project_id);
      if (existingProject) {
        const updatedProject = { ...existingProject, progress: offlineLog.overall_progress, updated_at: new Date().toISOString() };
        await db.projects.put(updatedProject);
        await db.queue.add({
          table: 'projects',
          action: 'update',
          targetId: dto.project_id,
          payload: { progress: offlineLog.overall_progress },
          createdAt: Date.now(),
        });
      }
    }

    return offlineLog;
  },

  async update(id: string, dto: UpdateDailyLogDto): Promise<DailyLog> {
    const isOnline = await checkNetworkStatus();

    const baseUpdate: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.log_date !== undefined) baseUpdate.log_date = dto.log_date;
    if (dto.weather_condition !== undefined) baseUpdate.weather_condition = dto.weather_condition;
    if (dto.temperature !== undefined) baseUpdate.temperature = dto.temperature;
    if (dto.temperature_min !== undefined) baseUpdate.temperature_min = dto.temperature_min;
    if (dto.site_status !== undefined) baseUpdate.site_status = dto.site_status;
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

    if (isOnline) {
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

      const updatedLog = {
        ...data,
        workers_present: data.workers_present || [],
        equipment_used: data.equipment_used || [],
        quantities: data.quantities || [],
        materials: data.materials || [],
        photos: data.photos || [],
      } as DailyLog;

      await db.daily_logs.put(updatedLog);

      // ربط نسبة التقدم مع المشروع
      if (updatedLog.overall_progress > 0) {
        await syncProjectProgress(updatedLog.project_id, updatedLog.overall_progress);
      }

      return updatedLog;
    }

    // Offline update path
    const existing = await db.daily_logs.get(id);
    if (!existing) {
      throw new Error('التقرير اليومي غير موجود في التخزين المحلي.');
    }

    const offlineUpdatedLog: DailyLog = {
      ...existing,
      ...dto,
      updated_at: new Date().toISOString(),
    } as DailyLog;

    await db.daily_logs.put(offlineUpdatedLog);

    const pendingCreate = await db.queue
      .where('targetId')
      .equals(id)
      .filter(item => item.table === 'daily_logs' && item.action === 'create')
      .first();

    if (pendingCreate) {
      pendingCreate.payload = offlineUpdatedLog;
      await db.queue.put(pendingCreate);
    } else {
      await db.queue.add({
        table: 'daily_logs',
        action: 'update',
        targetId: id,
        payload: fullUpdate,
        createdAt: Date.now(),
      });
    }

    // ربط نسبة التقدم مع المشروع (محلياً)
    if (offlineUpdatedLog.overall_progress > 0) {
      const existingProject = await db.projects.get(offlineUpdatedLog.project_id);
      if (existingProject) {
        const updatedProject = { ...existingProject, progress: offlineUpdatedLog.overall_progress, updated_at: new Date().toISOString() };
        await db.projects.put(updatedProject);
        await db.queue.add({
          table: 'projects',
          action: 'update',
          targetId: offlineUpdatedLog.project_id,
          payload: { progress: offlineUpdatedLog.overall_progress },
          createdAt: Date.now(),
        });
      }
    }

    return offlineUpdatedLog;
  },

  async delete(id: string): Promise<void> {
    const isOnline = await checkNetworkStatus();

    if (isOnline) {
      const { error } = await supabase
        .from('daily_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await db.daily_logs.delete(id);
      return;
    }

    // Offline delete path
    await db.daily_logs.delete(id);

    const pendingCreate = await db.queue
      .where('targetId')
      .equals(id)
      .filter(item => item.table === 'daily_logs' && item.action === 'create')
      .first();

    if (pendingCreate) {
      await db.queue.delete(pendingCreate.id!);
    } else {
      await db.queue.add({
        table: 'daily_logs',
        action: 'delete',
        targetId: id,
        payload: null,
        createdAt: Date.now(),
      });
    }
  },

  async uploadPhoto(file: File, projectId: string): Promise<string> {
    const isOnline = await checkNetworkStatus();
    if (!isOnline) {
      throw new Error('تحميل الصور يتطلب اتصالاً نشطاً بالإنترنت.');
    }

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
 * تصدير التقرير اليومي إلى PDF (شكل رسمي منظم - مع دعم العربية)
 */
  async generatePDF(log: DailyLog, isAr: boolean = true): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pw - 2 * margin;
    let y = margin;

    // ─── تحميل الخط العربي ───
    const arFont = 'NotoSansArabic';
    const fallbackFont = 'helvetica';
    const mainFont = isAr ? arFont : fallbackFont;
    if (isAr) {
      try {
        const fontUrl = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosansarabic/NotoSansArabic%5Bwdth,wght%5D.ttf';
        const fontRes = await fetch(fontUrl);
        const fontBuf = await fontRes.arrayBuffer();
        const fontB64 = btoa(Array.from(new Uint8Array(fontBuf), (b) => String.fromCharCode(b)).join(''));
        doc.addFileToVFS('NotoSansArabic.ttf', fontB64);
        doc.addFont('NotoSansArabic.ttf', arFont, 'normal', 'Identity-H');
        doc.addFont('NotoSansArabic.ttf', arFont, 'bold', 'Identity-H');
      } catch {
        console.warn('Failed to load Arabic font, using helvetica');
      }
    }

    // ─── Helper: تعيين الخط ───
    const setFont = (style: 'normal' | 'bold' = 'normal') => {
      doc.setFont(mainFont, style);
    };

    // ─── Helper: خط فاصل ───
    const hr = (yPos: number) => {
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pw - margin, yPos);
    };

    // ─── Helper: عنوان قسم ───
    const sectionTitle = (title: string, yPos: number) => {
      setFont('bold');
      doc.setFontSize(13);
      doc.setTextColor(220, 120, 30);
      doc.text(title, margin, yPos);
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      return yPos + 7;
    };

    // ─── Helper: نص عادي ───
    const bodyText = (text: string, x: number, yPos: number, fontSize = 10, fontStyle: "bold" | "normal" = "normal") => {
      setFont(fontStyle);
      doc.setFontSize(fontSize);
      doc.setTextColor(50, 50, 50);
      doc.text(text, x, yPos);
      return yPos + 6;
    };

    // ─── Helper: خلية جدول ───
    const tableRow = (cells: string[], yPos: number, header = false) => {
      const colW = contentWidth / cells.length;
      setFont(header ? 'bold' : 'normal');
      doc.setFontSize(9);
      cells.forEach((cell, i) => {
        const x = margin + i * colW;
        doc.text(cell, x + 1, yPos + 4);
      });
      if (header) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, yPos - 2, contentWidth, 7, "F");
      }
      hr(yPos + 6);
      return yPos + 10;
    };

    // ================================================================
    // 1. العنوان الرئيسي
    // ================================================================
    setFont('bold');
    doc.setFontSize(20);
    doc.setTextColor(30, 30, 30);
    doc.text(isAr ? "تقرير يومي للأشغال" : "RAPPORT JOURNALIER DES TRAVAUX", pw / 2, y, { align: "center" });
    y += 4;
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    setFont('normal');
    doc.text(`${isAr ? "منصة بناء - تقرير رقمي" : "Binaa Platform - Rapport Numérique"}`, pw / 2, y, { align: "center" });
    y += 8;
    hr(y);
    y += 6;

    // ================================================================
    // 2. المعلومات الأساسية
    // ================================================================
    y = sectionTitle(isAr ? "معلومات التقرير" : "INFORMATIONS DU RAPPORT", y);

    const infoLeft = [
      `${isAr ? "التاريخ" : "Date"}: ${log.log_date}`,
      `${isAr ? "درجة الحرارة" : "Température"}: ${log.temperature}°C${log.temperature_min != null ? ` / ${log.temperature_min}°C` : ''}`,
      `${isAr ? "الطقس" : "Météo"}: ${log.weather_condition}`,
      `${isAr ? "حالة الورشة" : "État du chantier"}: ${
        log.site_status === 'active' ? (isAr ? "نشطة" : "Active") :
        log.site_status === 'in_progress' ? (isAr ? "في تقدم" : "En cours") :
        log.site_status === 'delayed' ? (isAr ? "مؤجلة" : "Retardée") :
        log.site_status === 'inactive' ? (isAr ? "متوقفة" : "Inactive") :
        (isAr ? "مكتملة" : "Terminée")
      }`,
    ];
    const infoRight = [
      log.location_details ? `${isAr ? "الموقع" : "Localisation"}: ${log.location_details}` : null,
      log.overall_progress > 0 ? `${isAr ? "نسبة الإنجاز" : "Progrès"}: ${log.overall_progress}%` : null,
      log.estimated_value > 0 ? `${isAr ? "القيمة التقديرية" : "Valeur estimée"}: ${log.estimated_value.toLocaleString()} DZD` : null,
    ].filter(Boolean);

    setFont('normal');
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    infoLeft.forEach((line, i) => {
      doc.text(line, margin, y + i * 6);
    });
    infoRight.forEach((line, i) => {
      if (line) doc.text(line, margin + 90, y + i * 6);
    });
    y += Math.max(infoLeft.length, infoRight.length) * 6 + 4;
    hr(y);
    y += 8;

    // ================================================================
    // 3. ملخص الأعمال
    // ================================================================
    y = sectionTitle(isAr ? "ملخص الأعمال المنجزة" : "RÉSUMÉ DES TRAVAUX", y);
    setFont('normal');
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    const summaryLines = doc.splitTextToSize(log.work_summary || (isAr ? "لا يوجد" : "Aucun"), contentWidth);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 5 + 6;
    hr(y);
    y += 8;

    // ================================================================
    // 4. الكميات المنجزة
    // ================================================================
    if (log.quantities && log.quantities.length > 0) {
      y = sectionTitle(isAr ? "الكميات المنجزة (Situation des Métrés)" : "QUANTITÉS RÉALISÉES", y);
      y = tableRow(
        [isAr ? "بيان الأشغال" : "Désignation", isAr ? "الكمية" : "Qté", isAr ? "الوحدة" : "Unité"],
        y, true
      );
      log.quantities.forEach(q => {
        y = tableRow([q.description || "-", String(q.achieved_quantity), q.unit], y);
        if (y > ph - 30) {
          doc.addPage();
          y = margin + 10;
        }
      });
      y += 4;
      hr(y);
      y += 8;
    }

    // ================================================================
    // 5. المواد المستهلكة
    // ================================================================
    if (log.materials && log.materials.length > 0) {
      y = sectionTitle(isAr ? "المواد المستهلكة" : "MATÉRIAUX CONSOMMÉS", y);
      y = tableRow(
        [isAr ? "المادة" : "Matériau", isAr ? "الكمية" : "Qté", isAr ? "الوحدة" : "Unité"],
        y, true
      );
      log.materials.forEach(m => {
        y = tableRow([m.material_name || "-", String(m.quantity), m.unit], y);
        if (y > ph - 30) {
          doc.addPage();
          y = margin + 10;
        }
      });
      y += 4;
      hr(y);
      y += 8;
    }

    // ================================================================
    // 6. العمال الحاضرون
    // ================================================================
    if (log.workers_present && log.workers_present.length > 0) {
      y = sectionTitle(isAr ? "العمال الحاضرون" : "EFFECTIFS PRÉSENTS", y);
      y = tableRow(
        [isAr ? "الاسم" : "Nom", isAr ? "المنصب" : "Poste", isAr ? "ساعات العمل" : "Heures"],
        y, true
      );
      log.workers_present.forEach(w => {
        y = tableRow([w.worker_name, w.job_title || "-", `${w.hours_worked}H`], y);
        if (y > ph - 30) {
          doc.addPage();
          y = margin + 10;
        }
      });
      y += 4;
      hr(y);
      y += 8;
    }

    // ================================================================
    // 7. المعدات المستخدمة
    // ================================================================
    if (log.equipment_used && log.equipment_used.length > 0) {
      y = sectionTitle(isAr ? "المعدات المستخدمة" : "ENGINS UTILISÉS", y);
      y = tableRow(
        [isAr ? "المعدة" : "Engin", isAr ? "ساعات الاستخدام" : "Heures d'usage"],
        y, true
      );
      log.equipment_used.forEach(e => {
        y = tableRow([e.equipment_name, `${e.usage_hours} H`], y);
        if (y > ph - 30) {
          doc.addPage();
          y = margin + 10;
        }
      });
      y += 4;
      hr(y);
      y += 8;
    }

    // ================================================================
    // 8. المشاكل والملاحظات
    // ================================================================
    if (log.problems_faced || log.notes) {
      y = sectionTitle(isAr ? "المشاكل والملاحظات" : "PROBLÈMES & NOTES", y);
      if (log.problems_faced) {
        setFont('bold');
        y = bodyText(`${isAr ? "عقبات:" : "Incidents:"}`, margin, y, 10, "bold");
        setFont('normal');
        doc.setFontSize(10);
        doc.setTextColor(180, 60, 60);
        const pLines = doc.splitTextToSize(log.problems_faced, contentWidth);
        doc.text(pLines, margin, y);
        y += pLines.length * 5 + 4;
      }
      if (log.notes) {
        doc.setTextColor(50, 50, 50);
        setFont('bold');
        y = bodyText(`${isAr ? "ملاحظات:" : "Notes:"}`, margin, y, 10, "bold");
        setFont('normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        const nLines = doc.splitTextToSize(log.notes, contentWidth);
        doc.text(nLines, margin, y);
        y += nLines.length * 5 + 4;
      }
      hr(y);
      y += 6;
    }

    // ================================================================
    // 9. التذييل
    // ================================================================
    setFont('normal');
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text(
      `${isAr ? "منصة بناء - تقرير يومي للأشغال" : "Binaa Platform - Rapport Journalier"} | ${log.log_date}`,
      pw / 2, ph - 10,
      { align: "center" }
    );

    // حفظ الملف
    const fileName = `تقرير_${log.log_date}.pdf`;
    doc.save(fileName);
  },
};