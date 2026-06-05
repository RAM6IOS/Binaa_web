import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rentalService } from '@/lib/services/rental-service';

/**
 * POST /api/equipment/rent
 * تقديم طلب تأجير معدة جديد.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'غير مصرح به. يرجى تسجيل الدخول أولاً.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { equipment_id, project_id, owner_id, start_date, end_date, notes } = body;

    if (!equipment_id || !owner_id || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'بيانات غير مكتملة. يرجى تحديد المعدة والتواريخ.' },
        { status: 400 }
      );
    }

    const rental = await rentalService.createRentalRequest(
      {
        equipment_id,
        project_id: project_id || undefined,
        renter_id: user.id,
        owner_id,
        start_date,
        end_date,
        notes: notes || '',
      },
      supabase
    );

    return NextResponse.json({ success: true, rental }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating rental request:', error);
    return NextResponse.json(
      { error: error.message || 'حدث خطأ أثناء معالجة طلب التأجير.' },
      { status: 500 }
    );
  }
}
