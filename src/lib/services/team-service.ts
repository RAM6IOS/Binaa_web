import { createClient as createBrowserClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Company,
  CompanyMember,
  MembershipWithCompany,
  ResetPasswordResult,
} from '@/lib/types/team';
import type { MemberRole } from '@/lib/auth/permissions';

const getSupabase = (customClient?: SupabaseClient) => customClient || createBrowserClient();

async function resolveUserId(client: SupabaseClient): Promise<string | null> {
  const { data: { session } } = await client.auth.getSession();
  if (session?.user?.id) return session.user.id;
  try {
    const { data: { user } } = await client.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/* ── تخزين محلي للعضوية — لتشغيل الميدان دون اتصال (industry: مشروع بشركة معلومة) ── */

const MEMBERSHIP_CACHE_KEY = 'binaa:my-membership';

interface MembershipCache {
  membership: MembershipWithCompany;
  cachedAt: number;
}

export function readCachedMembership(): MembershipWithCompany | null {
  try {
    const raw = localStorage.getItem(MEMBERSHIP_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MembershipCache;
    return parsed.membership ?? null;
  } catch {
    return null;
  }
}

export function writeCachedMembership(membership: MembershipWithCompany | null): void {
  try {
    if (!membership) {
      localStorage.removeItem(MEMBERSHIP_CACHE_KEY);
      return;
    }
    localStorage.setItem(
      MEMBERSHIP_CACHE_KEY,
      JSON.stringify({ membership, cachedAt: Date.now() } satisfies MembershipCache)
    );
  } catch {
    // تخزين معطّل (خصوصية) — لا يكسر الجلسة
  }
}

export const teamService = {
  /**
   * العضوية النشطة للمستخدم الحالي (أول شركة).
   * عند انقطاع الشبكة يعود للتخزين المحلي حتى لا تُفقد معلومات الدور.
   */
  async getMyMembership(customClient?: SupabaseClient): Promise<MembershipWithCompany | null> {
    const client = getSupabase(customClient);
    const userId = await resolveUserId(client);
    if (!userId) return null;

    try {
      const { data, error } = await client
        .from('company_members')
        .select('*, company:companies(id, name)')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('joined_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      const membership = (data as MembershipWithCompany | null) ?? null;
      writeCachedMembership(membership);
      return membership;
    } catch {
      return readCachedMembership();
    }
  },

  /** شركة المستخدم الحالي (أول عضويتها النشطة). */
  async getMyCompany(customClient?: SupabaseClient): Promise<Company | null> {
    const membership = await this.getMyMembership(customClient);
    return membership?.company ?? null;
  },

  /** كل أعضاء الشركة — القراءة مقيّدة بـ RLS (أعضاء نفس الشركة فقط). */
  async listMembers(companyId: string, customClient?: SupabaseClient): Promise<CompanyMember[]> {
    const client = getSupabase(customClient);
    const { data, error } = await client
      .from('company_members')
      .select('*')
      .eq('company_id', companyId)
      .order('joined_at', { ascending: true });

    if (error) throw error;
    return (data as CompanyMember[]) ?? [];
  },

  /** تغيير دور عضو — يُنفَّذ عبر API لفرض assertCan() و آخر-مالك في الخادم. */
  async updateMemberRole(memberId: string, role: MemberRole): Promise<CompanyMember> {
    const res = await fetch(`/api/team/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error ?? 'فشل تغيير الدور');
    return json.member as CompanyMember;
  },

  /** تعطيل/تفعيل عضو — عبر API مع حماية آخر مالك. */
  async setMemberStatus(memberId: string, status: 'active' | 'disabled'): Promise<CompanyMember> {
    const res = await fetch(`/api/team/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error ?? 'فشل تحديث الحالة');
    return json.member as CompanyMember;
  },

  /** حذف عضو من الشركة (إلغاء عضوية فقط — لا يُحذف حساب Auth في الـ MVP). */
  async deleteMember(memberId: string): Promise<void> {
    const res = await fetch(`/api/team/members/${memberId}`, { method: 'DELETE' });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error ?? 'فشل حذف العضو');
  },

  /** إعادة تعيين كلمة مرور مؤقتة — يُنفَّذ عبر API آمن ويُرجِعها مرة واحدة فقط. */
  async resetMemberPassword(memberId: string): Promise<ResetPasswordResult> {
    const res = await fetch(`/api/team/members/${memberId}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error ?? 'فشل إعادة تعيين كلمة المرور');
    return { memberId, tempPassword: String(json?.tempPassword ?? '') };
  },
};