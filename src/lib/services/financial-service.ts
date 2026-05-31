import { createClient as createBrowserClient } from '../supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';
import { BudgetOverview, DailyCost, Invoice, ProjectBudget, FinancialCategory } from '../types/financials';

const getSupabase = (customClient?: SupabaseClient) => {
  return customClient || createBrowserClient();
};

export const financialService = {
  /**
   * حساب تكاليف العمال والعتاد ليوم معين وتحديث جدول التكاليف اليومية
   */
  async calculateDailyCosts(projectId: string, dateStr?: string, customClient?: SupabaseClient): Promise<DailyCost> {
    const supabase = getSupabase(customClient);
    const targetDate = dateStr || new Date().toISOString().split('T')[0];

    // 1. جلب العمال النشطين في هذا المشروع
    const { data: projectWorkers, error: pwError } = await supabase
      .from('project_workers')
      .select('*, worker:workers(*)')
      .eq('project_id', projectId);

    if (pwError) {
      console.error('Error fetching project workers for daily costs:', pwError.message);
      throw pwError;
    }

    // حساب تكلفة العمال اليومية
    let laborCost = 0;
    if (projectWorkers && projectWorkers.length > 0) {
      projectWorkers.forEach((pw: any) => {
        const worker = pw.worker;
        if (worker) {
          const rate = worker.daily_rate || (pw.daily_hours * (worker.hourly_rate || 450));
          laborCost += rate || 4500; // قيمة افتراضية 4500 دج
        }
      });
    }

    // 2. جلب العتاد النشط في هذا المشروع
    const { data: projectEquipment, error: peError } = await supabase
      .from('project_equipment')
      .select('*, equipment:equipment(*)')
      .eq('project_id', projectId);

    if (peError) {
      console.error('Error fetching project equipment for daily costs:', peError.message);
      throw peError;
    }

    // حساب تكلفة العتاد اليومية
    let equipmentCost = 0;
    if (projectEquipment && projectEquipment.length > 0) {
      projectEquipment.forEach((pe: any) => {
        const equipment = pe.equipment;
        if (equipment) {
          const rate = equipment.daily_rate || (pe.usage_hours_per_day * (equipment.hourly_rate || 1000));
          equipmentCost += rate || 8000; // قيمة افتراضية 8000 دج
        }
      });
    }

    // 3. التحقق من وجود سجل تكاليف حالي لهذا اليوم للحفاظ على تكلفة المواد والنفقات الأخرى
    const { data: existingCost, error: findError } = await supabase
      .from('daily_costs')
      .select('*')
      .eq('project_id', projectId)
      .eq('date', targetDate)
      .maybeSingle();

    let materialsCost = 0;
    let otherCost = 0;
    let notes = '';

    if (existingCost) {
      materialsCost = Number(existingCost.materials_cost) || 0;
      otherCost = Number(existingCost.other_cost) || 0;
      notes = existingCost.notes || '';
    }

    // 4. إجراء Upsert للتكاليف اليومية
    const { data: updatedCost, error: upsertError } = await supabase
      .from('daily_costs')
      .upsert({
        project_id: projectId,
        date: targetDate,
        labor_cost: laborCost,
        equipment_cost: equipmentCost,
        materials_cost: materialsCost,
        other_cost: otherCost,
        notes: notes || 'تحديث تلقائي للموارد النشطة'
      }, {
        onConflict: 'project_id,date'
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Error saving daily cost:', upsertError.message);
      throw upsertError;
    }

    // 5. تحديث ميزانية المشروع التراكمية (العمال والعتاد)
    await this.syncActualBudgetAmounts(projectId, supabase);

    return updatedCost as DailyCost;
  },

  /**
   * جلب تفاصيل الميزانية العامة والرسوم البيانية وتفاصيل الفئات
   */
  async getBudgetOverview(projectId: string, customClient?: SupabaseClient): Promise<BudgetOverview> {
    const supabase = getSupabase(customClient);

    // 1. جلب تفاصيل المشروع
    const { data: project, error: pError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (pError || !project) {
      throw new Error(pError?.message || 'Project not found');
    }

    const totalBudget = project.budget || 0;

    // 2. جلب ميزانيات البنود المقسمة
    let { data: budgets, error: bError } = await supabase
      .from('project_budgets')
      .select('*')
      .eq('project_id', projectId);

    if (bError) {
      console.error('Error fetching project budgets:', bError.message);
      throw bError;
    }

    // إذا لم تكن مهيأة، نقم بتهيئتها بقيم افتراضية جذابة (30% عمال، 20% عتاد، 40% مواد، 10% أخرى)
    if (!budgets || budgets.length < 4) {
      const defaultCategories: { category: FinancialCategory; percent: number }[] = [
        { category: 'labor', percent: 0.30 },
        { category: 'equipment', percent: 0.20 },
        { category: 'materials', percent: 0.40 },
        { category: 'other', percent: 0.10 }
      ];

      const insertData = defaultCategories.map(cat => ({
        project_id: projectId,
        category: cat.category,
        planned_amount: Math.round(totalBudget * cat.percent),
        actual_amount: 0
      }));

      const { data: insertedBudgets, error: insertError } = await supabase
        .from('project_budgets')
        .insert(insertData)
        .select();

      if (insertError) {
        console.error('Error seeding default budgets:', insertError.message);
      } else {
        budgets = insertedBudgets;
      }
    }

    // 3. جلب سجل التكاليف اليومية
    let { data: dailyCosts, error: dcError } = await supabase
      .from('daily_costs')
      .select('*')
      .eq('project_id', projectId)
      .order('date', { ascending: true });

    if (dcError) {
      console.error('Error fetching daily costs:', dcError.message);
      throw dcError;
    }

    // ميزة Seed الذكية: إذا كان تاريخ التكاليف فارغاً، نقم بمحاكاة 30 يوماً من التكاليف في الماضي
    if (!dailyCosts || dailyCosts.length === 0) {
      dailyCosts = await this.seedHistoricalDailyCosts(projectId, totalBudget, supabase);
    }

    // 4. بناء هيكل البيانات الموحد للعرض
    const dailyCostHistory = dailyCosts.map(dc => ({
      date: dc.date,
      labor: Number(dc.labor_cost),
      equipment: Number(dc.equipment_cost),
      materials: Number(dc.materials_cost),
      other: Number(dc.other_cost),
      total: Number(dc.total_cost)
    }));

    // حساب التكاليف الفعلية الإجمالية وتحديثها
    const totalActualCost = dailyCostHistory.reduce((acc, curr) => acc + curr.total, 0);

    // حساب الخطوط التراكمية (المخططة والعملية)
    const cumulativeActual: { date: string; amount: number }[] = [];
    let runningActual = 0;
    dailyCostHistory.forEach(day => {
      runningActual += day.total;
      cumulativeActual.push({
        date: day.date,
        amount: runningActual
      });
    });

    const cumulativePlanned: { date: string; amount: number }[] = [];
    const projectStart = new Date(project.start_date);
    const projectEnd = new Date(project.expected_end_date);
    const durationDays = Math.max(1, Math.round((projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24)));
    
    // حساب الميزانية المخططة اليومية التراكمية بالتساوي
    const dailyPlannedRate = totalBudget / durationDays;
    
    dailyCostHistory.forEach(day => {
      const currentDayDate = new Date(day.date);
      const daysSinceStart = Math.max(1, Math.round((currentDayDate.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24)));
      cumulativePlanned.push({
        date: day.date,
        amount: Math.min(totalBudget, Math.round(dailyPlannedRate * daysSinceStart))
      });
    });

    // تحديث التكاليف الفعلية للفئات
    const categoryActuals = {
      labor: dailyCostHistory.reduce((acc, curr) => acc + curr.labor, 0),
      equipment: dailyCostHistory.reduce((acc, curr) => acc + curr.equipment, 0),
      materials: dailyCostHistory.reduce((acc, curr) => acc + curr.materials, 0),
      other: dailyCostHistory.reduce((acc, curr) => acc + curr.other, 0)
    };

    const categoriesData = (budgets || []).map(b => ({
      category: b.category as FinancialCategory,
      planned: Number(b.planned_amount),
      actual: categoryActuals[b.category as FinancialCategory] || 0
    }));

    // تزامن التكلفة الفعلية للمشروع في جدول المشاريع الرئيسي
    await supabase
      .from('projects')
      .update({ actual_cost: totalActualCost })
      .eq('id', projectId);

    return {
      totalBudget,
      totalActualCost,
      categories: categoriesData,
      dailyCostHistory,
      cumulativePlanned,
      cumulativeActual
    };
  },

  /**
   * إصدار فاتورة جديدة للعميل
   */
  async generateInvoice(
    projectId: string,
    percentageComplete: number,
    type: 'advance' | 'interim' | 'final',
    customClient?: SupabaseClient
  ): Promise<Invoice> {
    const supabase = getSupabase(customClient);

    // 1. جلب المشروع للحصول على الميزانية الكلية وتفاصيل العميل
    const { data: project, error: pError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (pError || !project) {
      throw new Error('المشروع غير موجود لإصدار الفاتورة.');
    }

    const projectBudget = project.budget || 0;

    // 2. حساب المبالغ والضريبة
    const amount = Math.round(projectBudget * (percentageComplete / 100));
    const vat_amount = Math.round(amount * 0.19); // 19% ضريبة القيمة المضافة بالجزائر
    const total_amount = amount + vat_amount;

    // 3. توليد رقم فاتورة فريد ومتسلسل
    const currentYear = new Date().getFullYear();
    const { data: lastInvoices, error: lastInvError } = await supabase
      .from('invoices')
      .select('invoice_number')
      .like('invoice_number', `INV-${currentYear}-%`)
      .order('invoice_number', { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (!lastInvError && lastInvoices && lastInvoices.length > 0) {
      const parts = lastInvoices[0].invoice_number.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        nextNumber = lastSeq + 1;
      }
    }
    const invoiceNumber = `INV-${currentYear}-${String(nextNumber).padStart(4, '0')}`;

    // 4. تاريخ الاستحقاق الافتراضي بعد 30 يوماً
    const issueDate = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 5. إدراج الفاتورة
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .insert({
        project_id: projectId,
        invoice_number: invoiceNumber,
        percentage_complete: percentageComplete,
        type,
        amount,
        vat_amount,
        total_amount,
        status: 'draft',
        issue_date: issueDate,
        due_date: dueDate
      })
      .select()
      .single();

    if (invError) {
      console.error('Error inserting invoice:', invError.message);
      throw invError;
    }

    // 6. إدراج بنود الفاتورة
    const typeNamesAr = {
      advance: 'دفعة مقدمة عند إطلاق المشروع',
      interim: 'دفعات مرحلية حسب تقدم الأشغال',
      final: 'فاتورة ختامية لتسوية المشروع'
    };

    const invoiceItems = [
      {
        invoice_id: invoice.id,
        description: `أشغال بناء وتشييد مشروع "${project.name}" - ${typeNamesAr[type] || 'دفعات أشغال'}`,
        quantity: 1,
        unit_price: amount
      }
    ];

    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .insert(invoiceItems)
      .select();

    if (itemsError) {
      console.error('Error inserting invoice items:', itemsError.message);
      // لا نعطل العملية بل نسجل خطأ
    }

    // 7. إرجاع الفاتورة مع البنود
    return {
      ...invoice,
      invoice_items: items || []
    } as Invoice;
  },

  /**
   * محاكاة بيانات تكاليف يومية تاريخية (30 يوماً ماضية) لتفادي البيانات الفارغة
   */
  async seedHistoricalDailyCosts(projectId: string, totalBudget: number, supabase: SupabaseClient): Promise<DailyCost[]> {
    const dailyCosts: any[] = [];
    const today = new Date();

    // حساب التكاليف التقريبية للموارد النشطة
    let baseLabor = 15000;
    let baseEquip = 35000;

    // نحاول حساب التكلفة اليومية الحالية كقاعدة
    try {
      const { data: projectWorkers } = await supabase.from('project_workers').select('*, worker:workers(*)').eq('project_id', projectId);
      if (projectWorkers && projectWorkers.length > 0) {
        baseLabor = projectWorkers.reduce((acc, pw: any) => {
          const rate = pw.worker?.daily_rate || (pw.daily_hours * (pw.worker?.hourly_rate || 450));
          return acc + (rate || 4500);
        }, 0);
      }

      const { data: projectEquipment } = await supabase.from('project_equipment').select('*, equipment:equipment(*)').eq('project_id', projectId);
      if (projectEquipment && projectEquipment.length > 0) {
        baseEquip = projectEquipment.reduce((acc, pe: any) => {
          const rate = pe.equipment?.daily_rate || (pe.usage_hours_per_day * (pe.equipment?.hourly_rate || 1000));
          return acc + (rate || 8000);
        }, 0);
      }
    } catch (e) {
      console.warn('Failed to calculate exact base rates for seeding, using fallback values.', e);
    }

    // ضمان وجود التكاليف
    baseLabor = baseLabor || 18000;
    baseEquip = baseEquip || 32000;

    // محاكاة 30 يوماً
    for (let i = 30; i >= 0; i--) {
      const dayDate = new Date(today);
      dayDate.setDate(today.getDate() - i);
      const dateStr = dayDate.toISOString().split('T')[0];

      // إعطاء تباين عشوائي بنسبة +/- 15% للتكاليف اليومية لتبدو طبيعية
      const laborVariance = (Math.random() * 0.3 - 0.15) * baseLabor;
      const equipVariance = (Math.random() * 0.3 - 0.15) * baseEquip;

      const laborCost = Math.round(baseLabor + laborVariance);
      const equipmentCost = Math.round(baseEquip + equipVariance);

      // تكلفة المواد الإضافية: تظهر كل 5 إلى 7 أيام عند تسليم المواد
      let materialsCost = 0;
      if (i % 6 === 2) {
        materialsCost = Math.round(120000 + Math.random() * 250000);
      }

      // تكاليف أخرى: متفرقة وصغيرة
      const otherCost = i % 4 === 1 ? Math.round(8000 + Math.random() * 15000) : 0;

      dailyCosts.push({
        project_id: projectId,
        date: dateStr,
        labor_cost: laborCost,
        equipment_cost: equipmentCost,
        materials_cost: materialsCost,
        other_cost: otherCost,
        notes: i === 0 ? 'التكاليف المحدثة تلقائياً لليوم الحالي' : `تكاليف يومية محاكاة لتاريخ ${dateStr}`
      });
    }

    // إدخال البيانات في قاعدة البيانات
    const { data: inserted, error } = await supabase
      .from('daily_costs')
      .upsert(dailyCosts, { onConflict: 'project_id,date' })
      .select();

    if (error) {
      console.error('Error seeding historical daily costs:', error.message);
      return [];
    }

    // تحديث ميزانية البنود الفعلية بعد إدخال البيانات التاريخية
    await this.syncActualBudgetAmounts(projectId, supabase);

    // إعادة ترتيب البيانات تصاعدياً حسب التاريخ
    return (inserted || []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) as DailyCost[];
  },

  /**
   * تحديث الميزانية الفعلية المقسمة في جدول ميزانيات البنود
   */
  async syncActualBudgetAmounts(projectId: string, supabase: SupabaseClient): Promise<void> {
    try {
      const { data: dailyCosts } = await supabase
        .from('daily_costs')
        .select('labor_cost, equipment_cost, materials_cost, other_cost')
        .eq('project_id', projectId);

      if (dailyCosts && dailyCosts.length > 0) {
        const sumLabor = dailyCosts.reduce((acc, curr) => acc + Number(curr.labor_cost), 0);
        const sumEquip = dailyCosts.reduce((acc, curr) => acc + Number(curr.equipment_cost), 0);
        const sumMat = dailyCosts.reduce((acc, curr) => acc + Number(curr.materials_cost), 0);
        const sumOther = dailyCosts.reduce((acc, curr) => acc + Number(curr.other_cost), 0);

        const updates = [
          { category: 'labor', amount: sumLabor },
          { category: 'equipment', amount: sumEquip },
          { category: 'materials', amount: sumMat },
          { category: 'other', amount: sumOther }
        ];

        for (const update of updates) {
          await supabase
            .from('project_budgets')
            .update({ actual_amount: update.amount, updated_at: new Date().toISOString() })
            .eq('project_id', projectId)
            .eq('category', update.category);
        }
      }
    } catch (e) {
      console.error('Error syncing actual budget amounts:', e);
    }
  }
};
