import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { documentService } from '@/lib/services/document-service';

/**
 * GET /api/projects/[id]/documents
 * جلب وثائق المشروع المحدد.
 */
export async function GET(
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

    const { id: projectId } = await params;
    if (!projectId) {
      return NextResponse.json(
        { error: 'معرف المشروع مطلوب.' },
        { status: 400 }
      );
    }

    // التحقق من أمان المستخدم ووصوله للمشروع (يمكن التحقق من صلاحيات العضوية في الجدول المخصص للمشاريع إذا وجد)
    // هنا نجلب الوثائق مباشرة باستخدام خدمة المستندات عميل الخادم
    const documents = await documentService.getProjectDocuments(projectId, supabase);

    return NextResponse.json({
      documents,
      success: true
    }, { status: 200 });

  } catch (error: any) {
    console.error('حدث خطأ أثناء جلب مستندات المشروع في API:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم أثناء جلب المستندات.', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/documents
 * رفع وثيقة جديدة للمشروع المحدد.
 */
export async function POST(
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

    const { id: projectId } = await params;
    if (!projectId) {
      return NextResponse.json(
        { error: 'معرف المشروع مطلوب.' },
        { status: 400 }
      );
    }

    // قراءة البيانات المرسلة كـ FormData
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    const category = formData.get('category') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'الملف مطلوب للرفع.' },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { error: 'عنوان الوثيقة مطلوب.' },
        { status: 400 }
      );
    }

    const gpsCoordinates = formData.get('gps_coordinates') as string | null || formData.get('gpsCoordinates') as string | null;

    // رفع المستند باستخدام خدمة المستندات
    const newDocument = await documentService.uploadDocument(
      projectId,
      file,
      title,
      description || undefined,
      category || undefined,
      gpsCoordinates || undefined,
      supabase
    );

    return NextResponse.json({
      document: newDocument,
      success: true,
      message: 'تم رفع المستند بنجاح.'
    }, { status: 201 });

  } catch (error: any) {
    console.error('حدث خطأ أثناء رفع مستند المشروع في API:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم أثناء رفع المستند.', details: error.message },
      { status: 500 }
    );
  }
}
