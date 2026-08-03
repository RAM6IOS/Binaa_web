import { createClient } from "../supabase/client";
import {
  WorkAttachment,
  WorkAttachmentItem,
  WorkAttachmentWithItems,
  CreateWorkAttachmentDto,
  UpdateWorkAttachmentItemDto,
} from "../types/work-attachments";

const supabase = createClient();

export const workAttachmentsService = {
  // جلب كل المحاضر للمشروع
  async getByProject(projectId: string): Promise<WorkAttachment[]> {
    const { data, error } = await supabase
      .from("work_attachments")
      .select("*")
      .eq("project_id", projectId)
      .order("attachment_number", { ascending: false });

    if (error) {
      console.error("[WorkAttachments] Fetch error:", error.message);
      throw error;
    }
    return (data || []) as WorkAttachment[];
  },

  // جلب محضر مع بنوده
  async getById(id: string): Promise<WorkAttachmentWithItems> {
    const { data: attachment, error: attError } = await supabase
      .from("work_attachments")
      .select("*")
      .eq("id", id)
      .single();

    if (attError) throw attError;

    const { data: items, error: itemsError } = await supabase
      .from("work_attachment_items")
      .select("*")
      .eq("attachment_id", id)
      .order("sort_order", { ascending: true });

    if (itemsError) throw itemsError;

    return {
      ...(attachment as WorkAttachment),
      items: (items || []) as WorkAttachmentItem[],
    };
  },

  // فحص تداخل الفترات
  async hasPeriodOverlap(
    projectId: string,
    periodStart: string,
    periodEnd: string,
    excludeAttachmentId?: string
  ): Promise<{
    overlap: boolean;
    conflicting?: {
      id: string;
      attachment_number: number;
      period_start: string;
      period_end: string;
      status: string;
    }[];
  }> {
    let query = supabase
      .from("work_attachments")
      .select("id, attachment_number, period_start, period_end, status")
      .eq("project_id", projectId);

    if (excludeAttachmentId) {
      query = query.neq("id", excludeAttachmentId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[WorkAttachments] Overlap check error:", error.message);
      throw error;
    }

    if (!data || data.length === 0) {
      return { overlap: false };
    }

    const conflicting = data.filter((a) => {
      // period_start_A <= period_end_B AND period_start_B <= period_end_A
      return periodStart <= a.period_end && a.period_start <= periodEnd;
    });

    return {
      overlap: conflicting.length > 0,
      conflicting,
    };
  },

  // إنشاء محضر جديد وربطه ببنود العقد وحساب الكميات السابقة من المحاضر المعتمدة أو جدول المقاسات (metres)
  async create(dto: CreateWorkAttachmentDto): Promise<WorkAttachmentWithItems> {
    // 0. التحقق من صحة التواريخ
    if (dto.period_start > dto.period_end) {
      throw new Error("تاريخ البداية يجب أن يسبق تاريخ النهاية أو يساويه (La date de début doit être antérieure ou égale à la date de fin)");
    }

    // 0.1 التحقق من تداخل الفترات
    const overlapCheck = await this.hasPeriodOverlap(dto.project_id, dto.period_start, dto.period_end);
    if (overlapCheck.overlap && overlapCheck.conflicting && overlapCheck.conflicting.length > 0) {
      const c = overlapCheck.conflicting[0];
      throw new Error(
        `الفترة تتداخل مع المحضر N°${c.attachment_number} (${c.period_start} → ${c.period_end}). اختر فترة غير متداخلة.`
      );
    }

    // 1. تحديد رقم المحضر التلقائي
    const { data: existing, error: countError } = await supabase
      .from("work_attachments")
      .select("attachment_number")
      .eq("project_id", dto.project_id)
      .order("attachment_number", { ascending: false })
      .limit(1);

    if (countError) throw countError;

    const nextNumber = existing && existing.length > 0 ? existing[0].attachment_number + 1 : 1;

    // 2. جلب المستخدم الحالي
    let userId: string | undefined;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      userId = session.user.id;
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) userId = user.id;
    }

    // 3. جلب بنود العقد للمشروع (BPU / contract_items)
    const { data: contractItems, error: ciError } = await supabase
      .from("contract_items")
      .select("*")
      .eq("project_id", dto.project_id)
      .order("sort_order", { ascending: true })
      .order("item_number", { ascending: true });

    if (ciError) throw ciError;

    if (!contractItems || contractItems.length === 0) {
      throw new Error("لا توجد بنود كميات في هذا المشروع. أضف البنود من قسم الكميات المنجزة (Mètres) أولاً.");
    }

    // 4. جلب إجمالي الكميات المنجزة من جدول المقاسات (metres) كقاعدة أولية
    const { data: allMetres } = await supabase
      .from("metres")
      .select("contract_item_id, achieved_quantity")
      .eq("project_id", dto.project_id);

    let metresMap: Record<string, number> = {};
    if (allMetres) {
      allMetres.forEach((m) => {
        if (m.contract_item_id) {
          metresMap[m.contract_item_id] = (metresMap[m.contract_item_id] || 0) + (m.achieved_quantity || 0);
        }
      });
    }

    // 5. جلب المحاضر المعتمدة السابقة لحساب الكميات السابقة إن وجدت
    const { data: validatedAtts } = await supabase
      .from("work_attachments")
      .select("id")
      .eq("project_id", dto.project_id)
      .eq("status", "validated");

    const validatedIds = (validatedAtts || []).map((a) => a.id);

    let previousQtysMap: Record<string, number> = {};
    if (validatedIds.length > 0) {
      const { data: valItems } = await supabase
        .from("work_attachment_items")
        .select("contract_item_id, cumulative_qty, period_qty")
        .in("attachment_id", validatedIds);

      if (valItems) {
        valItems.forEach((vi) => {
          if (vi.contract_item_id) {
            previousQtysMap[vi.contract_item_id] = (previousQtysMap[vi.contract_item_id] || 0) + (vi.period_qty || 0);
          }
        });
      }
    }

    // 6. إنشاء رأس المحضر
    const { data: newAtt, error: createError } = await supabase
      .from("work_attachments")
      .insert({
        project_id: dto.project_id,
        attachment_number: nextNumber,
        period_start: dto.period_start,
        period_end: dto.period_end,
        status: "draft",
        notes: dto.notes || "",
        created_by: userId,
      })
      .select()
      .single();

    if (createError) throw createError;

    // 7. إنشاء بنود المحضر مع تحديد previous_qty إما من المحاضر المعتمدة أو من جدول metres
    const attachmentItemsPayload = contractItems.map((ci, idx) => {
      let prevQty = 0;
      if (validatedIds.length > 0 && previousQtysMap[ci.id] !== undefined) {
        prevQty = previousQtysMap[ci.id];
      } else {
        prevQty = metresMap[ci.id] || 0;
      }

      return {
        attachment_id: newAtt.id,
        contract_item_id: ci.id,
        item_code: ci.item_number,
        description: ci.designation,
        unit: ci.unit,
        contracted_qty: ci.quantity,
        previous_qty: prevQty,
        period_qty: 0,
        cumulative_qty: prevQty,
        notes: "",
        sort_order: ci.sort_order ?? idx,
      };
    });

    const { error: itemsInsertError } = await supabase
      .from("work_attachment_items")
      .insert(attachmentItemsPayload);

    if (itemsInsertError) throw itemsInsertError;

    return await this.getById(newAtt.id);
  },

  // تحديث بند في المحضر (إعادة حساب التراكمي فوراً)
  async updateItem(itemId: string, dto: UpdateWorkAttachmentItemDto): Promise<void> {
    const { data: item, error: fetchErr } = await supabase
      .from("work_attachment_items")
      .select("previous_qty, period_qty")
      .eq("id", itemId)
      .single();

    if (fetchErr) throw fetchErr;

    const periodQty = dto.period_qty !== undefined ? dto.period_qty : item.period_qty;
    const previousQty = item.previous_qty || 0;
    const cumulativeQty = previousQty + periodQty;

    const updatePayload: any = {
      cumulative_qty: cumulativeQty,
      updated_at: new Date().toISOString(),
    };
    if (dto.period_qty !== undefined) updatePayload.period_qty = dto.period_qty;
    if (dto.notes !== undefined) updatePayload.notes = dto.notes;

    const { error: updateErr } = await supabase
      .from("work_attachment_items")
      .update(updatePayload)
      .eq("id", itemId);

    if (updateErr) throw updateErr;
  },

  // اعتماد المحضر
  async validate(id: string): Promise<void> {
    const { error } = await supabase
      .from("work_attachments")
      .update({
        status: "validated",
        validated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;
  },

  // حذف محضر (فقط إذا كان مسودة)
  async delete(id: string): Promise<void> {
    const { data: att, error: fetchErr } = await supabase
      .from("work_attachments")
      .select("status")
      .eq("id", id)
      .single();

    if (fetchErr) throw fetchErr;
    if (att.status !== "draft") {
      throw new Error("لا يمكن حذف محضر معتمد.");
    }

    const { error } = await supabase
      .from("work_attachments")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  // Realtime subscription
  subscribe(projectId: string, callback: () => void) {
    const channelName = `work-attachments-${projectId}`;
    supabase.removeChannel(supabase.channel(channelName));

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "work_attachments", filter: `project_id=eq.${projectId}` },
        () => callback()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  },
};
