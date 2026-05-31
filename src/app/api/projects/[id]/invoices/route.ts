import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { financialService } from '@/lib/services/financial-service';

/**
 * GET /api/projects/[id]/invoices
 * جلب جميع الفواتير الصادرة لمشروع معين مع بنودها.
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

    const { data: invoices, error: invError } = await supabase
      .from('invoices')
      .select('*, invoice_items(*)')
      .eq('project_id', projectId)
      .order('issue_date', { ascending: false });

    if (invError) {
      console.error('Error fetching invoices in API:', invError.message);
      throw invError;
    }

    return NextResponse.json({
      invoices,
      success: true
    }, { status: 200 });

  } catch (error: any) {
    console.error('حدث خطأ أثناء جلب فواتير المشروع في API:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم أثناء جلب فواتير المشروع.', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/invoices
 * إنشاء فاتورة جديدة للمشروع.
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
    const { percentageComplete, type } = body;

    if (percentageComplete === undefined || percentageComplete === null || isNaN(percentageComplete)) {
      return NextResponse.json(
        { error: 'نسبة إنجاز الأشغال مطلوبة لإنشاء الفاتورة.' },
        { status: 400 }
      );
    }

    if (!type || !['advance', 'interim', 'final'].includes(type)) {
      return NextResponse.json(
        { error: 'نوع الفاتورة غير صالح. الخيارات المتاحة: advance, interim, final.' },
        { status: 400 }
      );
    }

    // إصدار الفاتورة باستخدام الخدمة المالية
    const invoice = await financialService.generateInvoice(
      projectId,
      Number(percentageComplete),
      type,
      supabase
    );

    return NextResponse.json({
      invoice,
      success: true,
      message: 'تم إصدار الفاتورة بنجاح وحفظها كمسودة.'
    }, { status: 201 });

  } catch (error: any) {
    console.error('حدث خطأ أثناء إصدار فاتورة جديدة في API:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم أثناء إصدار الفاتورة.', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects/[id]/invoices
 * تحديث حالة دفع الفاتورة أو تفاصيلها.
 */
export async function PATCH(
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

    const body = await request.json();
    const { invoiceId, status } = body;

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'معرف الفاتورة مطلوب لتحديث حالتها.' },
        { status: 400 }
      );
    }

    if (!status || !['draft', 'sent', 'paid', 'overdue'].includes(status)) {
      return NextResponse.json(
        { error: 'الحالة غير صالحة. القيم المقبولة: draft, sent, paid, overdue.' },
        { status: 400 }
      );
    }

    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
      .select('*, invoice_items(*)')
      .single();

    if (updateError) {
      console.error('Error updating invoice status:', updateError.message);
      throw updateError;
    }

    return NextResponse.json({
      invoice: updatedInvoice,
      success: true,
      message: 'تم تحديث حالة الفاتورة بنجاح.'
    }, { status: 200 });

  } catch (error: any) {
    console.error('حدث خطأ أثناء تحديث حالة الفاتورة في API:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم أثناء تحديث حالة الفاتورة.', details: error.message },
      { status: 500 }
    );
  }
}
