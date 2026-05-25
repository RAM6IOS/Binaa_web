import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { documentService } from '@/lib/services/document-service';

/**
 * DELETE /api/documents/[id]
 * حذف مستند/وثيقة محددة باستخدام المعرف.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'غير مصرح به. يرجى تسجيل الدخول أولاً.', details: authError?.message },
        { status: 401 }
      );
    }

    const { id: documentId } = await params;
    if (!documentId) {
      return NextResponse.json(
        { error: 'معرف المستند مطلوب لحذفه.' },
        { status: 400 }
      );
    }

    // استدعاء خدمة حذف المستند (تقوم بحذفه من Storage وقاعدة البيانات تلقائياً)
    await documentService.deleteDocument(documentId, supabase);

    return NextResponse.json({
      success: true,
      message: 'تم حذف المستند بنجاح.'
    }, { status: 200 });

  } catch (error: any) {
    console.error('حدث خطأ أثناء حذف مستند في API:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم أثناء حذف المستند.', details: error.message },
      { status: 500 }
    );
  }
}
