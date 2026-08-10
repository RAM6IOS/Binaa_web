// ═══════════════════════════════════════════════════════════════════
// خدمة وضعية الأشغال / Situation des Travaux - Service
// ═══════════════════════════════════════════════════════════════════

import { createClient } from "../supabase/client";
import {
  WorkSituation,
  WorkSituationItem,
  WorkSituationWithItems,
  CreateWorkSituationDto,
  UpdateWorkSituationFinancialsDto,
  UpdateWorkSituationItemDto,
} from "../types/situations";
import { numberToWords } from "../utils/number-to-words";

const supabase = createClient();

// دالة مساعدة لتحديث الجدول مع حذف أي عمود غير موجود في Schema تلقائياً عند الخطأ PGRST204
async function safeUpdate(table: string, payload: Record<string, any>, matchField: string, matchValue: any): Promise<void> {
  let currentPayload = { ...payload };
  for (let attempt = 0; attempt < 10; attempt++) {
    const { error } = await supabase
      .from(table)
      .update(currentPayload)
      .eq(matchField, matchValue);

    if (!error) return;

    if (error.code === "PGRST204" || error.message?.includes("column")) {
      const match = error.message.match(/Could not find the '([^']+)' column/i);
      if (match && match[1] && match[1] in currentPayload) {
        console.warn(`[Situations] العمود '${match[1]}' غير موجود في جدول '${table}'، يتم استثناؤه والإعادة تلقائياً...`);
        delete currentPayload[match[1]];
        continue;
      }
    }
    throw error;
  }
}

// دالة مساعدة للإدراج في الجدول مع حذف أي عمود غير موجود في Schema تلقائياً عند الخطأ PGRST204
async function safeInsert(table: string, payload: Record<string, any>): Promise<any> {
  let currentPayload = { ...payload };
  for (let attempt = 0; attempt < 10; attempt++) {
    const { data, error } = await supabase
      .from(table)
      .insert(currentPayload)
      .select()
      .single();

    if (!error && data) return data;

    if (error && (error.code === "PGRST204" || error.message?.includes("column"))) {
      const match = error.message.match(/Could not find the '([^']+)' column/i);
      if (match && match[1] && match[1] in currentPayload) {
        console.warn(`[Situations] العمود '${match[1]}' غير موجود في جدول '${table}'، يتم استثناؤه والإعادة تلقائياً...`);
        delete currentPayload[match[1]];
        continue;
      }
    }
    if (error) throw error;
  }
  throw new Error(`فشل الإدراج في جدول ${table}`);
}

export const situationsService = {
  // ────────────────────────────────────────────────────────────────────
  // حساب "Travaux précédemment certifiés" (البند 6)
  //
  // القاعدة: نأخذ قيمة آخر وضعية واحدة معتمدة (status='validated')
  // ذات أعلى situation_number أقل من الوضعية الحالية.
  //
  // ❌ INTERDIT: sum() على عدة وضعيات → يُضاعف القيم التراكمية
  // ❌ INTERDIT: net_a_payer أو montant_ttc كمصدر
  // ✅ AUTORISÉ: montant_ht (أولوية) → montant_brut → travaux_cumules
  // ────────────────────────────────────────────────────────────────────
  async calculateTravauxPrecedemmentCertifies(
    projectId: string,
    currentSituationNumber: number
  ): Promise<number> {
    // جلب آخر وضعية معتمدة واحدة فقط (DESC → limit 1)
    const { data, error } = await supabase
      .from("work_situations")
      .select("situation_number, montant_ht, montant_brut, travaux_cumules, status")
      .eq("project_id", projectId)
      .eq("status", "validated")
      .lt("situation_number", currentSituationNumber)
      .order("situation_number", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      // لا توجد وضعية معتمدة سابقة → البند 6 = 0
      return 0;
    }

    // ترتيب الأولوية: montant_ht → montant_brut → travaux_cumules
    const ht  = Number(data.montant_ht);
    const brut = Number(data.montant_brut);
    const cumul = Number(data.travaux_cumules);

    const amount = ht > 0 ? ht : (brut > 0 ? brut : (cumul || 0));

    console.log(
      `[Situations] Travaux précédemment certifiés ← N°${data.situation_number}`,
      `| montant_ht=${ht} | montant_brut=${brut} | travaux_cumules=${cumul}`,
      `→ valeur retenue=${amount}`
    );

    return amount;
  },

  // جلب كل الوضعيات للمشروع
  async getByProject(projectId: string): Promise<WorkSituation[]> {
    const { data, error } = await supabase
      .from("work_situations")
      .select("*")
      .eq("project_id", projectId)
      .order("situation_number", { ascending: false });

    if (error) {
      console.error("[Situations] Fetch error:", error.message);
      throw error;
    }
    return (data || []) as WorkSituation[];
  },

  // جلب وضعية مع بنودها
  async getById(id: string): Promise<WorkSituationWithItems> {
    const { data: situation, error: sitError } = await supabase
      .from("work_situations")
      .select("*")
      .eq("id", id)
      .single();

    if (sitError) throw sitError;

    const { data: items, error: itemsError } = await supabase
      .from("work_situation_items")
      .select("*")
      .eq("situation_id", id)
      .order("sort_order", { ascending: true })
      .order("item_code", { ascending: true });

    if (itemsError) throw itemsError;

    return {
      ...(situation as WorkSituation),
      items: (items || []) as WorkSituationItem[],
    };
  },

  // فحص تداخل الفترات
  async hasPeriodOverlap(
    projectId: string,
    periodStart?: string,
    periodEnd?: string,
    excludeSituationId?: string
  ): Promise<{
    overlap: boolean;
    conflicting?: {
      id: string;
      situation_number: number;
      period_start?: string;
      period_end?: string;
      status: string;
    }[];
  }> {
    if (!periodStart || !periodEnd) return { overlap: false };

    let query = supabase
      .from("work_situations")
      .select("id, situation_number, period_start, period_end, status")
      .eq("project_id", projectId);

    if (excludeSituationId) {
      query = query.neq("id", excludeSituationId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[Situations] Overlap check error:", error.message);
      throw error;
    }

    if (!data || data.length === 0) {
      return { overlap: false };
    }

    const conflicting = data.filter((s) => {
      if (!s.period_start || !s.period_end) return false;
      return periodStart <= s.period_end && s.period_start <= periodEnd;
    });

    return {
      overlap: conflicting.length > 0,
      conflicting,
    };
  },

  // إنشاء وضعية جديدة
  async create(dto: CreateWorkSituationDto): Promise<WorkSituationWithItems> {
    if (dto.period_start && dto.period_end && dto.period_start > dto.period_end) {
      throw new Error("تاريخ البداية يجب أن يسبق تاريخ النهاية أو يساويه");
    }

    // فحص تداخل الفترات
    const overlapCheck = await this.hasPeriodOverlap(dto.project_id, dto.period_start, dto.period_end);
    if (overlapCheck.overlap && overlapCheck.conflicting && overlapCheck.conflicting.length > 0) {
      const c = overlapCheck.conflicting[0];
      throw new Error(`الفترة تتداخل مع الوضعية N°${c.situation_number} (${c.period_start} → ${c.period_end})`);
    }

    // 1. تحديد رقم الوضعية التلقائي
    const { data: existing, error: countError } = await supabase
      .from("work_situations")
      .select("situation_number")
      .eq("project_id", dto.project_id)
      .order("situation_number", { ascending: false })
      .limit(1);

    if (countError) throw countError;
    const nextNumber = existing && existing.length > 0 ? existing[0].situation_number + 1 : 1;

    // 2. جلب المشروع وبياناته
    const { data: project, error: pError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", dto.project_id)
      .single();

    if (pError || !project) {
      throw new Error("المشروع غير موجود");
    }

    // 2.5 جلب آخر وضعية لهذا المشروع (بأي حالة) كمصدر للبيانات الافتراضية
    // ترتيب تنازلي لأخذ الأحدث رقماً (تحتوي على أحدث بيانات أدخلها المستخدم)
    const { data: validatedSitsRaw, error: lastSitErr } = await supabase
      .from("work_situations")
      .select("*")
      .eq("project_id", dto.project_id)
      .order("situation_number", { ascending: false });

    if (lastSitErr) {
      console.warn("[Situations] تحذير: فشل جلب الوضعيات المعتمدة (لن يوقف الإنشاء):", lastSitErr.message);
    }

    // المصدر المرجعي: آخر وضعية معتمدة تحتوي company_name حقيقي
    // الوضعيات المعتمدة اجتازت validate() التي تمنع: "Binaa Construction EURL"، NIF أصفار، RC فارغ
    const refSituation =
      validatedSitsRaw?.find((s) => s.company_name && s.company_name.trim() !== "") ??
      validatedSitsRaw?.[0] ??
      null;

    // دالة مساعدة: تُرجع القيمة الأولى غير الفارغة (تتجاهل null/undefined/"")
    const pickFirst = (...values: (string | null | undefined)[]): string => {
      for (const v of values) {
        if (v !== null && v !== undefined && v.trim() !== "") return v.trim();
      }
      return "";
    };

    // ترتيب الأولوية:
    // 1. بيانات المشروع (محفوظة عبر "حفظ التعديلات" في تبويب Snapshot)
    // 2. آخر وضعية معتمدة (بيانات حقيقية مضمونة)
    // 3. قيم بسيطة آمنة
    const defaults = {
      company_name:    pickFirst(project.company_name,    refSituation?.company_name),
      company_address: pickFirst(project.company_address, refSituation?.company_address),
      company_rc:      pickFirst(project.company_rc,      refSituation?.company_rc),
      company_rc_date: pickFirst(project.company_rc_date, refSituation?.company_rc_date),
      company_nif:     pickFirst(project.company_nif,     refSituation?.company_nif),
      company_nis:     pickFirst(project.company_nis,     refSituation?.company_nis),
      company_article: pickFirst(project.company_article, refSituation?.company_article),
      company_rib:     pickFirst(project.company_rib,     refSituation?.company_rib),
      company_bank:    pickFirst(project.company_bank,    refSituation?.company_bank),
      company_capital: pickFirst(project.company_capital, refSituation?.company_capital),
      lot_number:      pickFirst(project.lot_number,      refSituation?.lot_number,  "01"),
      lot_label:       pickFirst(project.lot_label,       refSituation?.lot_label,   project.description, "Lot unique"),
      marche_number:   pickFirst(project.contract_number, refSituation?.marche_number),
      client_name:     pickFirst(project.client_name,     refSituation?.client_name),
    };

    console.log("[Situations] المصدر المرجعي:", refSituation ? `وضعية N°${refSituation.situation_number} (معتمدة)` : "لا توجد وضعيات معتمدة");
    console.log("[Situations] قيم Snapshot المحلولة:", defaults);

    // 3. جلب المستخدم الحالي
    let userId: string | undefined;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) userId = session.user.id;

    // 4. جلب بنود العقد (contract_items)
    const { data: contractItems, error: ciError } = await supabase
      .from("contract_items")
      .select("*")
      .eq("project_id", dto.project_id)
      .order("sort_order", { ascending: true })
      .order("item_number", { ascending: true });

    if (ciError) throw ciError;
    if (!contractItems || contractItems.length === 0) {
      throw new Error("لا توجد بنود كميات في هذا المشروع. يجدر إضافة بنود العقد أولاً.");
    }

    // 5. جلب الوضعيات المعتمدة السابقة لحساب الكميات السابقة والمبالغ المعتمدة
    const travauxPrecedemmentCertifies = await this.calculateTravauxPrecedemmentCertifies(dto.project_id, nextNumber);

    const { data: validatedSituations } = await supabase
      .from("work_situations")
      .select("id")
      .eq("project_id", dto.project_id)
      .eq("status", "validated");

    const validatedIds = (validatedSituations || []).map((s) => s.id);

    let previousQtysMap: Record<string, number> = {};
    if (validatedIds.length > 0) {
      const { data: valItems } = await supabase
        .from("work_situation_items")
        .select("contract_item_id, cumulative_qty")
        .in("situation_id", validatedIds);

      if (valItems) {
        valItems.forEach((vi) => {
          if (vi.contract_item_id) {
            // أخذ أعلى كمية تراكمية وصلت إليها البنود
            previousQtysMap[vi.contract_item_id] = Math.max(
              previousQtysMap[vi.contract_item_id] || 0,
              Number(vi.cumulative_qty) || 0
            );
          }
        });
      }
    } else {
      // إن لم تكن هناك وضعيات مععتمدة، يمكن جلب الكميات من جدول المقاسات (metres) أو المحاضر المعتمدة
      const { data: allMetres } = await supabase
        .from("metres")
        .select("contract_item_id, achieved_quantity")
        .eq("project_id", dto.project_id);

      if (allMetres) {
        allMetres.forEach((m) => {
          if (m.contract_item_id) {
            previousQtysMap[m.contract_item_id] = (previousQtysMap[m.contract_item_id] || 0) + (Number(m.achieved_quantity) || 0);
          }
        });
      }
    }

    // 6. حساب إجمالي مبلغ العقد (TTC أو HT)
    const marcheAmountTtc = contractItems.reduce((acc, ci) => acc + ((ci.quantity || 0) * (ci.unit_price || 0)), 0);

    // 7. إدراج رأس الوضعية (بدون قيم تجريبية)
    const insertPayload: any = {
      project_id: dto.project_id,
      situation_number: nextNumber,
      arretee_au: dto.arretee_au,
      period_start: dto.period_start || null,
      period_end: dto.period_end || null,
      status: "draft",
      situation_type: dto.situation_type || "monthly",

      // Snapshot: ترتيب الأولوية: بيانات المشروع → آخر وضعية → قيمة افتراضية
      wilaya:          project.wilaya || "Alger",
      company_name:    defaults.company_name,
      company_address: defaults.company_address,
      company_rc:      defaults.company_rc,
      company_rc_date: defaults.company_rc_date,
      company_nif:     defaults.company_nif,
      company_nis:     defaults.company_nis,
      company_article: defaults.company_article,
      company_rib:     defaults.company_rib,
      company_bank:    defaults.company_bank,
      company_capital: defaults.company_capital,
      operation_name:  project.name,
      project_name:    project.name,
      marche_number:   defaults.marche_number,
      lot_number:      defaults.lot_number,
      lot_label:       defaults.lot_label,
      marche_amount_ttc: marcheAmountTtc,
      client_name: defaults.client_name || project.client_name || "",
      maitre_oeuvre: "",

      travaux_cumules: 0,
      avances_forfaitaires: 0,
      avances_approvisionnement: 0,
      travaux_avenant: 0,
      autres_montant: 0,
      total_1: 0,
      travaux_precedemment_certifies: travauxPrecedemmentCertifies,
      avances_forfaitaires_recues: 0,
      avances_appro_recues: 0,
      total_2: 0,
      montant_brut: 0,
      montant_ht: 0,
      tva_rate: 19,
      tva_amount: 0,
      montant_ttc: 0,
      retenue_garantie_rate: 5,
      retenue_garantie_amount: 0,
      net_a_payer: 0,
      net_a_payer_text: "Zero DZD",
      penalite_retard: 0,
      autre_deduction: 0,
      montant_net_maitre_ouvrage: 0,
      created_by: userId,
    };

    const newSit = await safeInsert("work_situations", insertPayload);

    // 8. إدراج بنود الوضعية
    let travauxCumules = 0;
    const itemsPayload = contractItems.map((ci, idx) => {
      const prevQty = previousQtysMap[ci.id] || 0;
      const periodQty = 0;
      const cumulativeQty = prevQty;
      const unitPrice = Number(ci.unit_price) || 0;
      const cumulativeAmount = cumulativeQty * unitPrice;
      travauxCumules += cumulativeAmount;

      return {
        situation_id: newSit.id,
        contract_item_id: ci.id,
        item_code: ci.item_number,
        description: ci.designation,
        unit: ci.unit,
        contracted_qty: ci.quantity || 0,
        previous_qty: prevQty,
        period_qty: periodQty,
        cumulative_qty: cumulativeQty,
        progress_percent: ci.quantity ? Math.min(100, Math.round((cumulativeQty / ci.quantity) * 100)) : 0,
        unit_price: unitPrice,
        period_amount: 0,
        cumulative_amount: cumulativeAmount,
        sort_order: ci.sort_order ?? idx,
      };
    });

    const { error: itemsInsErr } = await supabase
      .from("work_situation_items")
      .insert(itemsPayload);

    if (itemsInsErr) throw itemsInsErr;

    // 9. حساب مبالغ الوضعية وتحديثها
    await this.recalculate(newSit.id);

    return await this.getById(newSit.id);
  },

  // تحديث حقول مالية للوضعية
  async updateFinancialFields(situationId: string, dto: UpdateWorkSituationFinancialsDto): Promise<void> {
    const { data: sit, error: fetchErr } = await supabase
      .from("work_situations")
      .select("status")
      .eq("id", situationId)
      .single();

    if (fetchErr) throw fetchErr;
    if (sit.status !== "draft") {
      throw new Error("لا يمكن تعديل وضعية معتمدة.");
    }

    await safeUpdate("work_situations", {
      ...dto,
      updated_at: new Date().toISOString(),
    }, "id", situationId);

    await this.recalculate(situationId);
  },

  // تحديث لقطة الوضعية والبيانات الافتراضية للمشروع في نفس الوقت
  async updateSnapshotAndDefaults(situationId: string, projectId: string, dto: UpdateWorkSituationFinancialsDto): Promise<void> {
    // 1. تحديث الوضعية الحالية
    await this.updateFinancialFields(situationId, dto);
    
    // 2. تحديث البيانات الافتراضية في المشروع لاستخدامها في الوضعيات القادمة
    const projectUpdates: any = {
      updated_at: new Date().toISOString(),
    };
    if (dto.company_name !== undefined) projectUpdates.company_name = dto.company_name;
    if (dto.company_address !== undefined) projectUpdates.company_address = dto.company_address;
    if (dto.company_rc !== undefined) projectUpdates.company_rc = dto.company_rc;
    if (dto.company_rc_date !== undefined) projectUpdates.company_rc_date = dto.company_rc_date;
    if (dto.company_nif !== undefined) projectUpdates.company_nif = dto.company_nif;
    if (dto.company_nis !== undefined) projectUpdates.company_nis = dto.company_nis;
    if (dto.company_article !== undefined) projectUpdates.company_article = dto.company_article;
    if (dto.company_rib !== undefined) projectUpdates.company_rib = dto.company_rib;
    if (dto.company_bank !== undefined) projectUpdates.company_bank = dto.company_bank;
    if (dto.company_capital !== undefined) projectUpdates.company_capital = dto.company_capital;
    if (dto.lot_number !== undefined) projectUpdates.lot_number = dto.lot_number;
    if (dto.lot_label !== undefined) projectUpdates.lot_label = dto.lot_label;
    if (dto.client_name !== undefined) projectUpdates.client_name = dto.client_name;
    if (dto.marche_number !== undefined) projectUpdates.contract_number = dto.marche_number;

    await safeUpdate("projects", projectUpdates, "id", projectId);
  },

  // تحديث بند في الوضعية
  async updateItem(itemId: string, dto: UpdateWorkSituationItemDto): Promise<void> {
    const { data: item, error: fetchErr } = await supabase
      .from("work_situation_items")
      .select("*, situation:work_situations(status)")
      .eq("id", itemId)
      .single();

    if (fetchErr) throw fetchErr;
    if ((item as any).situation?.status !== "draft") {
      throw new Error("لا يمكن تعديل بنود وضعية معتمدة.");
    }

    const periodQty = dto.period_qty !== undefined ? Number(dto.period_qty) : Number(item.period_qty);
    const previousQty = Number(item.previous_qty) || 0;
    const cumulativeQty = previousQty + periodQty;
    const unitPrice = dto.unit_price !== undefined ? Number(dto.unit_price) : Number(item.unit_price);
    const contractedQty = Number(item.contracted_qty) || 0;
    const progressPercent = contractedQty > 0 ? Math.min(100, Math.round((cumulativeQty / contractedQty) * 100)) : 0;

    const periodAmount = periodQty * unitPrice;
    const cumulativeAmount = cumulativeQty * unitPrice;

    const updatePayload: any = {
      period_qty: periodQty,
      cumulative_qty: cumulativeQty,
      progress_percent: progressPercent,
      unit_price: unitPrice,
      period_amount: periodAmount,
      cumulative_amount: cumulativeAmount,
      updated_at: new Date().toISOString(),
    };
    if (dto.notes !== undefined) updatePayload.notes = dto.notes;

    const { error: updateErr } = await supabase
      .from("work_situation_items")
      .update(updatePayload)
      .eq("id", itemId);

    if (updateErr) throw updateErr;

    // إعادة حساب الوضعية بالكامل
    await this.recalculate(item.situation_id);
  },

  // إعادة حساب إجماليات الصفحة 1 وفق الترتيب المالي الرسمي (1 إلى 14)
  async recalculate(situationId: string): Promise<void> {
    // 1. جلب الوضعية
    const { data: sit, error: sitErr } = await supabase
      .from("work_situations")
      .select("*")
      .eq("id", situationId)
      .single();

    if (sitErr || !sit) return;

    // 2. حساب travaux_precedemment_certifies من الوضعيات المعتمدة السابقة
    const travauxPrecedemmentCertifies = await this.calculateTravauxPrecedemmentCertifies(sit.project_id, sit.situation_number);

    // 3. جلب بنود الوضعية
    const { data: items } = await supabase
      .from("work_situation_items")
      .select("period_amount, cumulative_amount")
      .eq("situation_id", situationId);

    // 1. Travaux cumulés
    let travauxCumules = 0;
    if (items) {
      items.forEach((it) => {
        travauxCumules += Number(it.cumulative_amount) || 0;
      });
    }

    // 2. Avances forfaitaires
    const avancesForfaitaires = Number(sit.avances_forfaitaires) || 0;
    // 3. Avances approvisionnement
    const avancesApprovisionnement = Number(sit.avances_approvisionnement) || 0;
    // 4. Travaux en avenant
    const travauxAvenant = Number(sit.travaux_avenant) || 0;
    // 5. Autres
    const autresMontant = Number(sit.autres_montant) || 0;

    // TOTAL 1 = (1) + (2) + (3) + (4) + (5)
    const total1 = Math.round((travauxCumules + avancesForfaitaires + avancesApprovisionnement + travauxAvenant + autresMontant) * 100) / 100;

    // 6. Travaux précédemment certifiés (تم جلبها أعلاه ديناميكياً)
    // 7. Avances forfaitaires reçues / remboursées
    const avancesForfaitairesRecues = Number(sit.avances_forfaitaires_recues) || 0;
    // 8. Avances appro reçues
    const avancesApproRecues = Number(sit.avances_appro_recues) || 0;

    // TOTAL 2 = (6) + (7) + (8)
    const total2 = Math.round((travauxPrecedemmentCertifies + avancesForfaitairesRecues + avancesApproRecues) * 100) / 100;

    // 9. MONTANT BRUT = TOTAL 1 - TOTAL 2
    // ⚠️ لا نصفّر القيمة السالبة بصمت: يجب تسجيل تحذير لمساعدة التشخيص
    const montantBrutRaw = Math.round((total1 - total2) * 100) / 100;
    if (montantBrutRaw < 0) {
      console.warn(
        `[Situations] ⚠️ Montant brut négatif détecté (id=${situationId}):`,
        `TOTAL1=${total1}, TOTAL2=${total2}, Brut=${montantBrutRaw}`,
        "→ Vérifiez travaux_precedemment_certifies vs travaux_cumules"
      );
    }
    const montantBrut = Math.max(0, montantBrutRaw);

    // 10. MONTANT H.T. = Montant brut
    const montantHt = montantBrut;

    // 11. T.V.A. = HT × tva_rate/100
    const tvaRate = Number(sit.tva_rate) ?? 19;
    const tvaAmount = Math.round((montantHt * (tvaRate / 100)) * 100) / 100;

    // 12. MONTANT T.T.C. = HT + TVA
    const montantTtc = Math.round((montantHt + tvaAmount) * 100) / 100;

    // 13. Retenue de garantie = TTC × retenue_rate/100
    const retenueGarantieRate = Number(sit.retenue_garantie_rate) ?? 5;
    const retenueGarantieAmount = Math.round((montantTtc * (retenueGarantieRate / 100)) * 100) / 100;

    // 14. NET À PAYER = TTC - Retenue
    const netAPayer = Math.max(0, Math.round((montantTtc - retenueGarantieAmount) * 100) / 100);
    const netAPayerText = numberToWords(netAPayer, "fr");

    const penaliteRetard = Number(sit.penalite_retard) || 0;
    const autreDeduction = Number(sit.autre_deduction) || 0;
    const montantNetMaitreOuvrage = Math.max(0, Math.round((netAPayer - penaliteRetard - autreDeduction) * 100) / 100);

    // 3. تحديث الحقول في القاعدة
    await supabase
      .from("work_situations")
      .update({
        travaux_cumules: travauxCumules,
        total_1: total1,
        travaux_precedemment_certifies: travauxPrecedemmentCertifies,
        total_2: total2,
        montant_brut: montantBrut,
        montant_ht: montantHt,
        tva_amount: tvaAmount,
        montant_ttc: montantTtc,
        retenue_garantie_amount: retenueGarantieAmount,
        net_a_payer: netAPayer,
        net_a_payer_text: netAPayerText,
        montant_net_maitre_ouvrage: montantNetMaitreOuvrage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", situationId);
  },

  // اعتماد الوضعية (مع منع الاعتماد ببيانات غير صالحة)
  async validate(id: string): Promise<void> {
    const sitWithItems = await this.getById(id);
    if (!sitWithItems) throw new Error("الوضعية غير موجودة / Situation introuvable");

    if (sitWithItems.status === "validated") {
      throw new Error("هذه الوضعية معتمدة مسبقاً / Situation déjà validée.");
    }

    const companyName = (sitWithItems.company_name || "").trim();
    const companyNif = (sitWithItems.company_nif || "").trim();
    const companyRc = (sitWithItems.company_rc || "").trim();
    const projectName = (sitWithItems.project_name || "").trim();
    const lotLabel = (sitWithItems.lot_label || "").trim().toLowerCase();

    if (!companyName || companyName.toLowerCase() === "binaa construction eurl" || companyName.toLowerCase().includes("test")) {
      throw new Error("خطأ في الاعتماد: اسم الشركة/المقاوِلة فارغ أو تجريبي غير معتمد (Company name is missing or placeholder).");
    }

    if (!companyNif || companyNif === "000000000000000" || companyNif === "0" || /^0+$/.test(companyNif)) {
      throw new Error("خطأ في الاعتماد: الرقم الضريبي (NIF) فارغ أو يتكون من أصفار فقط (NIF is missing or invalid zeros).");
    }

    if (!companyRc || companyRc === "0000000000" || companyRc === "0" || /^0+$/.test(companyRc)) {
      throw new Error("خطأ في الاعتماد: السجل التجاري (RC) فارغ أو غير صالح (RC is missing or invalid).");
    }

    if (!projectName) {
      throw new Error("خطأ في الاعتماد: اسم المشروع فارغ (Project name is missing).");
    }

    if (!sitWithItems.items || sitWithItems.items.length === 0) {
      throw new Error("خطأ في الاعتماد: لا توجد بنود أشغال في هذه الوضعية (No items found in this situation).");
    }

    if (lotLabel.includes("test") || lotLabel.includes("placeholder")) {
      throw new Error("خطأ في الاعتماد: بيانات الحصة (Lot label) تبدو كمحتوى تجريبي (Placeholder detected).");
    }

    await this.recalculate(id);

    const { error } = await supabase
      .from("work_situations")
      .update({
        status: "validated",
        validated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    // إعادة حساب الوضعيات اللاحقة لتحديث travaux_precedemment_certifies تلقائياً
    const { data: subsequentSituations } = await supabase
      .from("work_situations")
      .select("id")
      .eq("project_id", sitWithItems.project_id)
      .gt("situation_number", sitWithItems.situation_number);

    if (subsequentSituations) {
      for (const subSit of subsequentSituations) {
        await this.recalculate(subSit.id);
      }
    }
  },

  // حذف وضعية (فقط إذا كانت draft)
  async delete(id: string): Promise<void> {
    const { data: sit, error: fetchErr } = await supabase
      .from("work_situations")
      .select("status")
      .eq("id", id)
      .single();

    if (fetchErr) throw fetchErr;
    if (sit.status !== "draft") {
      throw new Error("لا يمكن حذف وضعية معتمدة.");
    }

    const { error } = await supabase
      .from("work_situations")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  // Realtime
  subscribe(projectId: string, callback: () => void) {
    const channelName = `work-situations-${projectId}`;
    supabase.removeChannel(supabase.channel(channelName));

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "work_situations", filter: `project_id=eq.${projectId}` },
        () => callback()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  },
};
