// يولّد جلسات حقيقية لحسابات الاختبار وينتج data/tokens.json لاستخدام k6
// الجلسات عبر كلمات مرور حقيقية و anon key فقط — لا service_role إطلاقاً
// الاستخدام: node scripts/k6/generate-tokens.mjs
// متغيرات اختيارية: SESSIONS_PER_ACCOUNT (افتراضي 25)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const ACCOUNTS_FILE = path.join(DATA_DIR, "accounts.json");
const OUT_FILE = path.join(DATA_DIR, "tokens.json");

const SUPABASE_URL = "https://sazpcswwafnqanbsyhon.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_GOSS2_y36Z_fjuWqa7ScHg_fn3JeRP-";
const COOKIE_KEY = "sb-sazpcswwafnqanbsyhon-auth-token";
const SESSIONS_PER_ACCOUNT = parseInt(process.env.SESSIONS_PER_ACCOUNT || "25", 10);

// ── نسخة مطابقة تماماً لخوارزمية التجزئة في @supabase/ssr ──
const BASE64_PREFIX = "base64-";
const MAX_CHUNK_SIZE = 3180;

function chunk(key, value) {
  const encodedValue = encodeURIComponent(value);
  if (encodedValue.length <= MAX_CHUNK_SIZE) {
    return [{ name: key, value }];
  }
  const chunks = [];
  let remaining = encodedValue;
  while (remaining.length > 0) {
    let head = remaining.slice(0, MAX_CHUNK_SIZE);
    const lastEscape = head.lastIndexOf("%");
    if (lastEscape > MAX_CHUNK_SIZE - 3) {
      head = head.slice(0, lastEscape);
    }
    let valueHead = "";
    while (head.length > 0) {
      try {
        valueHead = decodeURIComponent(head);
        break;
      } catch (err) {
        if (err instanceof URIError && head.at(-3) === "%" && head.length > 3) {
          head = head.slice(0, head.length - 3);
        } else {
          throw err;
        }
      }
    }
    chunks.push(valueHead);
    remaining = remaining.slice(valueHead.length);
  }
  return chunks.map((v, i) => ({ name: `${key}.${i}`, value: v }));
}

// يبني قيمة كوكي جلسة supabase-ssr كاملة (مع التجزئة عند الحاجة)
function buildCookie(session) {
  const json = JSON.stringify(session);
  const encoded = BASE64_PREFIX + Buffer.from(json).toString("base64url");
  return chunk(COOKIE_KEY, encoded)
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

function loadAccounts() {
  if (!fs.existsSync(ACCOUNTS_FILE)) {
    console.error(`✗ الملف غير موجود: ${ACCOUNTS_FILE}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf8")).accounts;
}

async function main() {
  const accounts = loadAccounts();
  const sessions = [];

  for (const account of accounts) {
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await authClient.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    });
    if (error) {
      console.error(`✗ فشل تسجيل الدخول لـ ${account.email}: ${error.message}`);
      continue;
    }

    const session = data.session;
    console.log(`✓ ${account.email} — تسجيل دخول ناجح (user: ${session.user.id})`);

    // جلب مشاريع حقيقية لهذا المستخدم (قراءة فقط) لاستخدامها في صفحة التفاصيل
    const dataClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${session.access_token}` } },
    });
    const { data: projects, error: projectsError } = await dataClient
      .from("projects")
      .select("id, name")
      .eq("created_by", session.user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (projectsError) {
      console.warn(`  ⚠ تعذّر جلب المشاريع: ${projectsError.message}`);
    }
    const projectIds = (projects || []).map((p) => p.id);
    console.log(`  → ${projectIds.length} مشروع متاح للاختبار`);

    for (let i = 0; i < SESSIONS_PER_ACCOUNT; i++) {
      const { data: sessionData, error: sessionError } =
        await authClient.auth.signInWithPassword({
          email: account.email,
          password: account.password,
        });
      if (sessionError) {
        console.warn(`  ⚠ جلسة ${i} فشلت: ${sessionError.message}`);
        continue;
      }
      const s = sessionData.session;
      sessions.push({
        email: account.email,
        accessToken: s.access_token,
        refreshToken: s.refresh_token,
        expiresAt: s.expires_at,
        userId: s.user.id,
        projectIds,
        cookie: buildCookie(s),
      });
    }
  }

  if (sessions.length === 0) {
    console.error("✗ لا توجد جلسات مولّدة — تحقق من الحسابات/كلمة المرور.");
    process.exit(1);
  }

  fs.writeFileSync(
    OUT_FILE,
    JSON.stringify({ generatedAt: new Date().toISOString(), sessions }, null, 2)
  );
  console.log(`\n✓ تم توليد ${sessions.length} جلسة → ${OUT_FILE}`);
}

main().catch((err) => {
  console.error("✗ خطأ غير متوقع:", err);
  process.exit(1);
});
