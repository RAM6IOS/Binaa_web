import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notificationService } from '@/lib/services/notification-service';

/**
 * DELETE /api/notifications/[id]
 * حذف إشعار محدد للمستخدم الحالي.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. إنشاء عميل Supabase الخاص بالخادم والتحقق من هوية المستخدم
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'غير مصرح به. يرجى تسجيل الدخول أولاً.', details: authError?.message },
        { status: 401 }
      );
    }

    // 2. فك معلمات المسار (Awaiting params as standard in Next.js 15+)
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'معرف الإشعار مطلوب لحذفه.' },
        { status: 400 }
      );
    }

    // 3. استدعاء خدمة حذف الإشعارات مع التحقق من الأمان والملكية
    await notificationService.deleteNotification(id, user.id, supabase);

    return NextResponse.json({
      success: true,
      message: 'تم حذف الإشعار بنجاح.'
    }, { status: 200 });

  } catch (error: any) {
    console.error('حدث خطأ أثناء حذف الإشعار في API:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم أثناء حذف الإشعار.', details: error.message },
      { status: 500 }
    );
  }
}
