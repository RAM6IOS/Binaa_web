import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/equipment
 * جلب قائمة معدات المستخدم الحالي.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'غير مصرح به.' }, { status: 401 });
    }

    const { data: equipment, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ equipment: equipment || [] }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching equipment:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب المعدات.' },
      { status: 500 }
    );
  }
}
