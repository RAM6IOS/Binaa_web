// إعدادات اختبار الحمل الموحّدة (تُستورد من كل السكربتات)
// لا يحتوي أي أسرار — المفتاح العام فقط (كما يظهر في متصفح المستخدم)

export const APP_BASE = "https://binaa-web.vercel.app";
export const LOCALE = "ar";
export const APP = `${APP_BASE}/${LOCALE}`;

export const SUPABASE_URL = "https://sazpcswwafnqanbsyhon.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_GOSS2_y36Z_fjuWqa7ScHg_fn3JeRP-";
export const AUTH_COOKIE = "sb-sazpcswwafnqanbsyhon-auth-token";

export const REST = `${SUPABASE_URL}/rest/v1`;
export const AUTH = `${SUPABASE_URL}/auth/v1`;

export const cfg = {
  APP_BASE,
  APP,
  LOCALE,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  AUTH_COOKIE,
  REST,
  AUTH,
};

// العتبات الأساسية (تُعَدَّل لكل اختبار حسب مراحله)
export const baseThresholds = {
  http_req_failed: ["rate<0.01"],
  "http_req_duration{group:ssr}": ["p(95)<1500"],
  "http_req_duration{group:rest}": ["p(95)<500"],
  "http_req_duration{group:api}": ["p(95)<800"],
  "http_req_duration{group:auth}": ["p(95)<1500"],
  "http_req_duration{group:assets}": ["p(95)<3000"],
};
