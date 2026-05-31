import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { financialService } from '@/lib/services/financial-service';

/**
 * GET /api/projects/[id]/budget
 * جلب نظرة عامة على ميزانية المشروع وسجل التكاليف اليومية.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'غير مصرح به. يرجى تسجيل الدخول أولاً.', details: authError?.message },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;
    if (!projectId) {
      return NextResponse.json(
        { error: 'معرف المشروع مطلوب.' },
        { status: 400 }
      );
    }

    // 1. حساب تكاليف اليوم الحالي تلقائياً لضمان تحديث البيانات
    try {
      await financialService.calculateDailyCosts(projectId, undefined, supabase);
    } catch (e) {
      console.warn('Could not compute daily resources cost in API route, falling back to cached results.', e);
    }

    // 2. جلب نظرة عامة على الميزانية والتاريخ
    const overview = await financialService.getBudgetOverview(projectId, supabase);

    return NextResponse.json({
      overview,
      success: true
    }, { status: 200 });

  } catch (error: any) {
    console.error('حدث خطأ أثناء جلب ميزانية المشروع في API:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم أثناء جلب الميزانية والمالية.', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/budget
 * تحديث الميزانيات المخططة لفئات معينة (العمال، العتاد، المواد، أخرى).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'غير مصرح به. يرجى تسجيل الدخول أولاً.', details: authError?.message },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;
    if (!projectId) {
      return NextResponse.json(
        { error: 'معرف المشروع مطلوب.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { categories } = body; // Array of { category: 'labor', planned: 500000 }

    if (!categories || !Array.isArray(categories)) {
      return NextResponse.json(
        { error: 'البيانات المرسلة غير صالحة. يجب توفير مصفوفة الفئات.' },
        { status: 400 }
      );
    }

    // تحديث مبالغ الفئات المخططة
    for (const item of categories) {
      const { category, planned } = item;
      const { error: updateError } = await supabase
        .from('project_budgets')
        .update({
          planned_amount: planned,
          updated_at: new Date().toISOString()
        })
        .eq('project_id', projectId)
        .eq('category', category);

      if (updateError) {
        console.error(`Error updating planned amount for ${category}:`, updateError.message);
        throw updateError;
      }
    }

    // جلب نظرة عامة محدثة
    const overview = await financialService.getBudgetOverview(projectId, supabase);

    return NextResponse.json({
      overview,
      success: true,
      message: 'تم تحديث تخطيط الميزانية بنجاح.'
    }, { status: 200 });

  } catch (error: any) {
    console.error('حدث خطأ أثناء تحديث ميزانية المشروع في API:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم أثناء تحديث ميزانية الفئات.', details: error.message },
      { status: 500 }
    );
  }
}
