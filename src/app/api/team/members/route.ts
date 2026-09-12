import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { teamService } from '@/lib/services/team-service';
import { createMemberByAdmin } from '@/lib/services/team-admin-service';
import { assertCan } from '@/lib/auth/permissions';
import type { CreateMemberInput } from '@/lib/types/team';

/**
 * POST /api/team/members
 * إضافة عضو إدارياً (اسم كامل + بريد + دور + كلمة مؤقتة) داخل شركة المنفّذ.
 * - الخادم فقط (service role) — لا يمكن للعميل تنفيذ ذلك أبداً.
 * - المنفّذ يجب أن يملك manage_team (owner أو admin).
 * - رفض role=owner.
 * - يبحث عن البريد في auth أولاً: يعيد تفعيل عضو معطّل (A)، يربط بحساب
 *   موجود (B)، أو ينشئ حساباً جديداً (C) — من دون استدعاء createUser
 *   لبريد مسجّل مسبقاً.
 * - كلمة المرور المؤقتة تُرجَع مرة واحدة فقط للنسخ، وتغيب في الحالة (linked).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'غير مصرح به. يرجى تسجيل الدخول أولاً.' }, { status: 401 });
  }

  let actor: Awaited<ReturnType<typeof teamService.getMyMembership>>;
  try {
    actor = await teamService.getMyMembership(supabase);
    assertCan(actor?.role ?? null, 'manage_team');
  } catch (err) {
    return NextResponse.json(
      { error: 'غير مصرح — هذه العملية تتطلب إدارة الفريق.', details: (err as Error).message },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => null)) as Partial<CreateMemberInput> | null;
  if (!body) {
    return NextResponse.json({ error: 'بيانات غير صالحة.' }, { status: 400 });
  }

  try {
    const input: CreateMemberInput = {
      companyId: actor!.company_id,
      full_name: String(body.full_name ?? ''),
      email: String(body.email ?? ''),
      role: body.role === 'admin' ? 'admin' : 'member',
      tempPassword: body.tempPassword,
    };

    const result = await createMemberByAdmin(input);
    return NextResponse.json({ ...result, success: true }, { status: 201 });
  } catch (err) {
    // رسائل التحقق كلها عربية من createMemberByAdmin — تُمرَّر كما هي
    const message = (err as Error).message || 'حدث خطأ أثناء إنشاء العضو';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}