// تنظيف بيانات اختبار الحمل [LOADTEST]
// يحذف المهام التي title يحتوي LOADTEST على مشاريع حسابات الاختبار فقط
// مصادقة: توكن كل حساب من tokens.json، أو إعادة تسجيل دخول بكلمة مروره (anon key فقط — لا service_role)
// يعرض العدد قبل الحذف وبعده. الاستخدام: node scripts/k6/cleanup-loadtest.mjs [--dry-run]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const TOKENS_FILE = path.join(DATA_DIR, "tokens.json");
const ACCOUNTS_FILE = path.join(DATA_DIR, "accounts.json");

const SUPABASE_URL = "https://sazpcswwafnqanbsyhon.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_GOSS2_y36Z_fjuWqa7ScHg_fn3JeRP-";

const DRY_RUN = process.argv.includes("--dry-run");

const accounts = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf8")).accounts;
let tokens = [];
try {
  tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, "utf8")).sessions;
} catch {}

// يبني عميلاً مفوضاً بحساب معيّن: جلسة صالحة من tokens.json أو تسجيل دخول جديد
async function getAccountContext(email) {
  const now = Math.floor(Date.now() / 1000);
  const valid = tokens.find(
    (s) => s.email === email && s.expiresAt > now + 60 && s.projectIds?.length
  );

  if (valid) {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${valid.accessToken}` } },
    });
    return { client, projectIds: valid.projectIds, source: "tokens.json" };
  }

  const account = accounts.find((a) => a.email === email);
  if (!account) throw new Error(`لا يوجد حساب مسجّل لـ ${email}`);

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await authClient.auth.signInWithPassword({
    email,
    password: account.password,
  });
  if (error) throw new Error(`إعادة تسجيل الدخول لـ ${email}: ${error.message}`);

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });
  const { data: projects, error: projectsError } = await client
    .from("projects")
    .select("id")
    .eq("created_by", data.session.user.id);
  if (projectsError) throw new Error(`جلب مشاريع ${email}: ${projectsError.message}`);

  return { client, projectIds: (projects || []).map((p) => p.id), source: "تسجيل دخول جديد" };
}

async function countTagged(client, projectIds) {
  const { count, error } = await client
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .ilike("title", "*LOADTEST*")
    .in("project_id", projectIds);
  if (error) throw new Error(`العدّ: ${error.message}`);
  return count || 0;
}

async function main() {
  console.log(DRY_RUN ? "═══ وضع المعاينة (--dry-run): لا حذف ═══" : "═══ الحذف الفعلي ═══");
  let totalBefore = 0;
  let totalDeleted = 0;

  for (const account of accounts) {
    try {
      const ctx = await getAccountContext(account.email);
      const before = await countTagged(ctx.client, ctx.projectIds);
      totalBefore += before;

      if (before === 0) {
        console.log(`• ${account.email} — لا توجد مهام [LOADTEST] (المصدر: ${ctx.source})`);
        continue;
      }

      let after = before;
      if (!DRY_RUN) {
        const { error } = await ctx.client
          .from("tasks")
          .delete()
          .ilike("title", "*LOADTEST*")
          .in("project_id", ctx.projectIds);
        if (error) throw new Error(`الحذف: ${error.message}`);
        after = await countTagged(ctx.client, ctx.projectIds);
      }

      const deleted = before - after;
      totalDeleted += deleted;
      console.log(
        `• ${account.email} — قبل: ${before} | حذف: ${deleted} | بعد: ${after} (المصدر: ${ctx.source})`
      );
    } catch (err) {
      console.error(`✗ ${account.email}: ${err.message}`);
    }
  }

  console.log("\n──── الخلاصة ────");
  console.log(`إجمالي قبل: ${totalBefore} | محذوف: ${DRY_RUN ? 0 : totalDeleted} | بعد: ${totalBefore - (DRY_RUN ? 0 : totalDeleted)}`);
  if (DRY_RUN) {
    console.log("لم يُحذف شيء — أعد التشغيل بدون --dry-run للتنفيذ.");
  }
}

main().catch((err) => {
  console.error("✗ خطأ غير متوقع:", err);
  process.exit(1);
});
