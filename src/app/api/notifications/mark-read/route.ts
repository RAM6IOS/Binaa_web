import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notificationService } from '@/lib/services/notification-service';

/**
 * POST /api/notifications/mark-read
 * تحديد إشعار معين كمقروء (عند تمرير id) أو تحديد كافة الإشعارات كمقروءة (عند تمرير all: true).
 */
export async function POST(request: NextRequest) {
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

    // 2. قراءة بيانات الطلب (Request Body)
    let body: { id?: string; all?: boolean } = {};
    try {
      body = await request.json();
    } catch (e) {
      // إذا كان الطلب فارغاً، نفترض افتراضياً أننا نريد قراءة الكل
      body = { all: true };
    }

    const { id, all } = body;

    // 3. تحديد كمقروء بناء على المعلمات الممررة
    if (id) {
      // تحديد إشعار معين كمقروء
      const updatedNotification = await notificationService.markAsRead(id, user.id, supabase);
      return NextResponse.json({
        success: true,
        notification: updatedNotification,
        message: 'تم تحديد الإشعار كمقروء بنجاح.'
      }, { status: 200 });
    } else if (all || all === undefined) {
      // تحديد الكل كمقروء
      await notificationService.markAllAsRead(user.id, supabase);
      return NextResponse.json({
        success: true,
        message: 'تم تحديد جميع الإشعارات كمقروءة بنجاح.'
      }, { status: 200 });
    }

    return NextResponse.json(
      { error: 'طلب غير صالح. يجب تمرير id الإشعار أو قيمة all لتحديد الكل.' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('حدث خطأ أثناء تحديث حالة قراءة الإشعارات في API:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم أثناء تحديث حالة القراءة.', details: error.message },
      { status: 500 }
    );
  }
}
