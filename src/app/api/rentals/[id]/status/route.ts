import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rentalService } from '@/lib/services/rental-service';
import { RentalStatus } from '@/lib/types/projects';

/**
 * PUT /api/rentals/[id]/status
 * تحديث حالة طلب التأجير (قبول / رفض / إكمال).
 */
export async function PUT(
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

    const { id: rentalId } = await params;
    if (!rentalId) {
      return NextResponse.json({ error: 'معرف الحجز مطلوب.' }, { status: 400 });
    }

    const body = await request.json();
    const { status } = body as { status: RentalStatus };

    if (!status) {
      return NextResponse.json({ error: 'الحالة المطلوبة غير متوفرة.' }, { status: 400 });
    }

    // 1. التحقق من صلاحيات المستخدم على هذا الحجز
    const { data: rental, error: fetchError } = await supabase
      .from('equipment_rentals')
      .select('owner_id, renter_id')
      .eq('id', rentalId)
      .single();

    if (fetchError || !rental) {
      return NextResponse.json({ error: 'طلب التأجير غير موجود.' }, { status: 404 });
    }

    // - الموافقة والرفض صلاحية مالك العتاد حصراً
    if ((status === 'approved' || status === 'rejected') && rental.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'غير مصرح به. مالك العتاد فقط يمكنه قبول أو رفض الطلب.' },
        { status: 403 }
      );
    }

    // - إنهاء التأجير يمكن القيام به بواسطة المالك أو المستأجر
    if (status === 'completed' && rental.owner_id !== user.id && rental.renter_id !== user.id) {
      return NextResponse.json(
        { error: 'غير مصرح به. أطراف العقد فقط يمكنهم إكمال فترة التأجير.' },
        { status: 403 }
      );
    }

    // 2. تحديث الحالة في قاعدة البيانات وتنفيذ العمليات المترتبة
    await rentalService.updateRentalStatus(rentalId, status, supabase);

    return NextResponse.json({
      success: true,
      message: `تم تحديث حالة طلب التأجير إلى "${status}" بنجاح.`
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error updating rental status in API:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم أثناء تحديث حالة طلب التأجير.', details: error.message },
      { status: 500 }
    );
  }
}
