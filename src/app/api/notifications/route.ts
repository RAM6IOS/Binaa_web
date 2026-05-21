import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notificationService } from '@/lib/services/notification-service';

/**
 * GET /api/notifications
 * جلب إشعارات المستخدم الحالي مع حساب عدد الإشعارات غير المقروءة.
 * يدعم المعلمات: limit (الحد الأقصى) و offset (الإزاحة).
 */
export async function GET(request: NextRequest) {
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

    // 2. تحليل معلمات الاستعلام (Query Parameters)
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // 3. استدعاء خدمة الإشعارات باستخدام عميل Supabase المخصص للخادم
    const [notifications, unreadCount] = await Promise.all([
      notificationService.getNotifications(user.id, limit, offset, supabase),
      notificationService.getUnreadCount(user.id, supabase)
    ]);

    // 4. إرجاع النتيجة بنجاح
    return NextResponse.json({
      notifications,
      unreadCount,
      success: true
    }, { status: 200 });

  } catch (error: any) {
    console.error('حدث خطأ أثناء جلب الإشعارات في API:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم أثناء جلب الإشعارات.', details: error.message },
      { status: 500 }
    );
  }
}
