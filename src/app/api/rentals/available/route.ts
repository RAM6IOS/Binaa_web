import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rentalService } from '@/lib/services/rental-service';

/**
 * GET /api/rentals/available
 * جلب المعدات المعروضة للتأجير مع الفلاتر.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'غير مصرح به.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filters = {
      category: searchParams.get('category') || undefined,
      wilaya: searchParams.get('wilaya') || undefined,
      searchQuery: searchParams.get('q') || undefined,
      minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
      maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
      userLat: searchParams.get('lat') ? Number(searchParams.get('lat')) : undefined,
      userLon: searchParams.get('lon') ? Number(searchParams.get('lon')) : undefined,
    };

    const equipment = await rentalService.getAvailableEquipment(filters, supabase);

    return NextResponse.json({ success: true, equipment }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching available equipment:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب المعدات المتاحة.', details: error.message },
      { status: 500 }
    );
  }
}
