import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rentalService } from '@/lib/services/rental-service';

/**
 * GET /api/equipment/[id]/availability
 * جلب تواريخ عدم التوفر لمعدة معينة.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: equipmentId } = await params;
    if (!equipmentId) {
      return NextResponse.json({ error: 'معرف المعدة مطلوب.' }, { status: 400 });
    }

    const supabase = await createClient();
    const availability = await rentalService.getEquipmentAvailability(equipmentId, supabase);

    return NextResponse.json({
      success: true,
      availability,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching equipment availability:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب تواريخ توافر المعدة.', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/equipment/[id]/availability
 * حظر فترة زمنية يدوياً من قِبل المالك.
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
        { error: 'غير مصرح به. يرجى تسجيل الدخول أولاً.' },
        { status: 401 }
      );
    }

    const { id: equipmentId } = await params;
    if (!equipmentId) {
      return NextResponse.json({ error: 'معرف المعدة مطلوب.' }, { status: 400 });
    }

    // التحقق من أن المستخدم الحالي هو مالك المعدة فعلاً
    const { data: equipment, error: equipError } = await supabase
      .from('equipment')
      .select('owner_id')
      .eq('id', equipmentId)
      .single();

    if (equipError || !equipment) {
      return NextResponse.json({ error: 'المعدة غير موجودة.' }, { status: 404 });
    }

    if (equipment.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'غير مصرح لك بتعديل توافر هذه المعدة لأنك لست المالك.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { start_date, end_date, notes } = body;

    if (!start_date || !end_date) {
      return NextResponse.json(
        { error: 'يرجى تقديم تاريخ البدء وتاريخ الانتهاء لفترة الحظر.' },
        { status: 400 }
      );
    }

    const block = await rentalService.addManualAvailabilityBlock(
      equipmentId,
      start_date,
      end_date,
      notes,
      supabase
    );

    return NextResponse.json({
      success: true,
      message: 'تم حظر التواريخ بنجاح.',
      block,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error adding availability block:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء إضافة فترة الحظر.', details: error.message },
      { status: 500 }
    );
  }
}
