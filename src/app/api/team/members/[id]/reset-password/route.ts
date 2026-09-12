import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { teamService } from '@/lib/services/team-service';
import { resetMemberPassword } from '@/lib/services/team-admin-service';
import { assertCan } from '@/lib/auth/permissions';

/**
 * POST /api/team/members/[id]/reset-password
 * إعادة تعيين كلمة مرور مؤقتة لعضو (صاحب حساب Auth) — service role على الخادم فقط.
 * - المنفّذ owner/admin (manage_team) والهدف في نفس شركته (RLS + تحقق صريح).
 * - لا تُقرأ الكلمة القديمة ولا تُخزَّن الجديدة — تُرجَع مرة واحدة للواجهة.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'غير مصرح به. يرجى تسجيل الدخول أولاً.' }, { status: 401 });
  }

  let actor: Awaited<ReturnType<typeof teamService.getMyMembership>>;
  try {
    actor = await teamService.getMyMembership(supabase);
    assertCan(actor?.role ?? null, 'manage_team');
  } catch {
    return NextResponse.json(
      { error: 'غير مصرح — هذه العملية تتطلب إدارة الفريق.' },
      { status: 403 }
    );
  }

  const memberId = (await params).id;

  // جلب الهدف عبر RLS (أعضاء نفس الشركة فقط) + تحقق صريح من نفس الشركة
  const { data: target, error: targetError } = await supabase
    .from('company_members')
    .select('id, company_id, user_id')
    .eq('id', memberId)
    .single();

  if (targetError || !target || target.company_id !== actor?.company_id) {
    return NextResponse.json({ error: 'العضو غير موجود ضمن شركتك.' }, { status: 404 });
  }

  if (!target.user_id) {
    return NextResponse.json(
      { error: 'هذا العضو لم يُنشأ له حساب تسجيل دخول بعد.' },
      { status: 400 }
    );
  }

  try {
    const { tempPassword } = await resetMemberPassword(target.user_id);
    return NextResponse.json({ memberId, tempPassword, success: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}