import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { teamService } from '@/lib/services/team-service';
import { assertCan } from '@/lib/auth/permissions';
import type { MemberRole } from '@/lib/auth/permissions';
import type { MemberStatus } from '@/lib/types/team';

/**
 * PATCH /api/team/members/[id]
 * تغيير دور عضو أو تعطيله/تفعيله.
 * - المنفّذ owner/admin (can manage_team).
 * - رفض إنشاء owner أو تغيير دور مالك قائم.
 * - تعطيل المالك الوحيد محمي بـ RLS Trigger أيضاً.
 */
export async function PATCH(
  request: NextRequest,
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
  const { data: target, error: targetError } = await supabase
    .from('company_members')
    .select('*')
    .eq('id', memberId)
    .single();

  if (targetError || !target) {
    return NextResponse.json({ error: 'العضو غير موجود ضمن شركتك.' }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as { role?: string; status?: string } | null;
  if (!body) return NextResponse.json({ error: 'بيانات غير صالحة.' }, { status: 400 });

  const updates: Partial<Record<'role' | 'status', string>> = {};

  if (body.role !== undefined) {
    if (body.role === 'owner') {
      return NextResponse.json({ error: 'لا يمكن منح دور المالك من هذه الواجهة.' }, { status: 400 });
    }
    if (!['admin', 'member'].includes(body.role)) {
      return NextResponse.json({ error: 'دور غير صالح.' }, { status: 400 });
    }
    if (target.role === 'owner') {
      return NextResponse.json({ error: 'لا يمكن تغيير دور المالك.' }, { status: 400 });
    }
    updates.role = body.role;
  }

  if (body.status !== undefined) {
    if (!['active', 'disabled'].includes(body.status)) {
      return NextResponse.json({ error: 'حالة غير صالحة.' }, { status: 400 });
    }
    updates.status = body.status;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'لا شيء للتحديث.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('company_members')
    .update(updates as { role?: MemberRole; status?: MemberStatus })
    .eq('id', memberId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ member: data, success: true }, { status: 200 });
}

/**
 * DELETE /api/team/members/[id]
 * إلغاء/إزالة عضوية عضو من الشركة — لا يُحذف حساب Auth (قرار الـ MVP).
 * - المنفّذ owner/admin (صلاحية manage_team) — عضوية الشركة تُفرض بـ RLS.
 * - رفض حذف أي owner (الصف المحمي) — وآخر owner محمي بـ Trigger أيضاً.
 * - حذف الصف يعني فقد العضو للوصول للتطبيق فوراً حتى لو بقي حسابه.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'غير مصرح به. يرجى تسجيل الدخول أولاً.' }, { status: 401 });
  }

  try {
    const actor = await teamService.getMyMembership(supabase);
    assertCan(actor?.role ?? null, 'manage_team');
  } catch {
    return NextResponse.json(
      { error: 'غير مصرح — هذه العملية تتطلب إدارة الفريق.' },
      { status: 403 }
    );
  }

  const memberId = (await params).id;
  const { data: target, error: targetError } = await supabase
    .from('company_members')
    .select('id, company_id, role')
    .eq('id', memberId)
    .single();

  if (targetError || !target) {
    return NextResponse.json({ error: 'العضو غير موجود ضمن شركتك.' }, { status: 404 });
  }

  if (target.role === 'owner') {
    return NextResponse.json({ error: 'لا يمكن حذف المالك.' }, { status: 400 });
  }

  const { error } = await supabase.from('company_members').delete().eq('id', memberId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, deleted: true }, { status: 200 });
}