import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rentalService } from '@/lib/services/rental-service';

/**
 * GET /api/rentals/my-equipment
 * جلب المعدات المعروضة للتأجير الخاصة بالمستخدم.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'غير مصرح به.' }, { status: 401 });
    }

    const equipment = await rentalService.getMyEquipmentForRent(user.id, supabase);
    return NextResponse.json({ success: true, equipment }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching my equipment for rent:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب معداتك.', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/rentals/my-equipment
 * تفعيل/إيقاف أو تحديث تفاصيل تأجير معدة.
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'غير مصرح به.' }, { status: 401 });
    }

    const body = await request.json();
    const { equipment_id, is_for_rent, ...details } = body;

    if (!equipment_id) {
      return NextResponse.json({ error: 'معرّف المعدة مطلوب.' }, { status: 400 });
    }

    let result;
    if (typeof is_for_rent === 'boolean') {
      result = await rentalService.toggleEquipmentForRent(equipment_id, is_for_rent, details, supabase);
    } else {
      result = await rentalService.updateRentalEquipmentDetails(equipment_id, details, supabase);
    }

    return NextResponse.json({ success: true, equipment: result }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating equipment for rent:', error);
    return NextResponse.json(
      { error: error.message || 'حدث خطأ أثناء تحديث المعدة.' },
      { status: 500 }
    );
  }
}
