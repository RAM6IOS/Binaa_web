import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rentalService } from '@/lib/services/rental-service';

/**
 * GET /api/my-rentals
 * جلب طلبات التأجير الصادرة والواردة للمستخدم الحالي.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'غير مصرح به. يرجى تسجيل الدخول أولاً.', details: authError?.message },
        { status: 401 }
      );
    }

    const rentals = await rentalService.getMyRentals(user.id, supabase);

    return NextResponse.json({
      success: true,
      ...rentals
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching user rentals in API:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب طلبات التأجير الخاصة بك.', details: error.message },
      { status: 500 }
    );
  }
}
