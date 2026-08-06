// رحلات المستخدم المشتركة — تعيد إنتاج الطلبات الحقيقية التي يرسلها التطبيق
// (صفحات SSR + استعلامات Supabase REST + API + الأصول الثابتة)

import http from "k6/http";
import { check } from "k6";
import { cfg } from "../config.js";
import {
  randomSession,
  randomAccount,
  restHeaders,
  authHeaders,
  fetchAssets,
  weightedPick,
} from "./helpers.js";

const PAGE_PARAMS = { redirects: 0, tags: { group: "ssr" } };

function ssrRequest(path, session) {
  return http.get(`${cfg.APP}${path}`, {
    ...PAGE_PARAMS,
    headers: { Cookie: session.cookie },
  });
}

// ── لوحة القيادة: shell + 3 استعلامات REST متوازية (كما في Promise.all) ──
export function journeyDashboard() {
  const s = randomSession();
  if (!s) return;
  const page = ssrRequest("/projects/dashboard", s);
  check(page, { "dashboard ssr 200": (r) => r.status === 200 });

  const h = restHeaders(s.accessToken);
  http.batch([
    [
      "GET",
      `${cfg.REST}/projects?select=*&created_by=eq.${s.userId}&order=created_at.desc`,
      null,
      { headers: h, tags: { group: "rest" } },
    ],
    [
      "GET",
      `${cfg.REST}/workers?select=*&user_id=eq.${s.userId}&deleted_at=is.null&order=created_at.desc`,
      null,
      { headers: h, tags: { group: "rest" } },
    ],
    [
      "GET",
      `${cfg.REST}/equipment?select=*&user_id=eq.${s.userId}&deleted_at=is.null&order=created_at.desc`,
      null,
      { headers: h, tags: { group: "rest" } },
    ],
  ]);

  fetchAssets(cfg.APP_BASE, page.body);
}

// ── قائمة المشاريع: shell + استعلام واحد ──
export function journeyProjectsList() {
  const s = randomSession();
  if (!s) return;
  const page = ssrRequest("/projects", s);
  check(page, { "projects list ssr 200": (r) => r.status === 200 });

  const h = restHeaders(s.accessToken);
  http.get(
    `${cfg.REST}/projects?select=*&created_by=eq.${s.userId}&order=created_at.desc`,
    { headers: h, tags: { group: "rest" } }
  );

  fetchAssets(cfg.APP_BASE, page.body);
}

// ── صفحة مشروع: shell + 3 استعلامات (مشروع/مستندات/مهام) على مشروع حقيقي ──
export function journeyProjectDetail() {
  const s = randomSession();
  if (!s) return;
  if (!s.projectIds || s.projectIds.length === 0) return;
  const projectId = s.projectIds[Math.floor(Math.random() * s.projectIds.length)];

  const page = ssrRequest(`/projects/${projectId}`, s);
  check(page, { "project detail ssr 200": (r) => r.status === 200 });

  const h = restHeaders(s.accessToken);
  http.batch([
    [
      "GET",
      `${cfg.REST}/projects?select=*&id=eq.${projectId}&created_by=eq.${s.userId}`,
      null,
      { headers: h, tags: { group: "rest" } },
    ],
    [
      "GET",
      `${cfg.REST}/project_documents?select=*&project_id=eq.${projectId}&order=uploaded_at.desc`,
      null,
      { headers: h, tags: { group: "rest" } },
    ],
    [
      "GET",
      `${cfg.REST}/tasks?select=*&project_id=eq.${projectId}&order=created_at.desc`,
      null,
      { headers: h, tags: { group: "rest" } },
    ],
  ]);

  fetchAssets(cfg.APP_BASE, page.body);
}

// ── الإشعارات عبر Next.js API route ──
export function journeyNotifications() {
  const s = randomSession();
  if (!s) return;
  const res = http.get(`${cfg.APP_BASE}/api/notifications?limit=10`, {
    redirects: 0,
    headers: { Cookie: s.cookie },
    tags: { group: "api" },
  });
  check(res, { "notifications 200": (r) => r.status === 200 });
}

// ── تسجيل الدخول الفعلي عبر Supabase Auth (يقيس Auth endpoint) ──
export function journeyAuth() {
  const account = randomAccount();
  if (!account) return;
  const res = http.post(
    `${cfg.AUTH}/token?grant_type=password`,
    JSON.stringify({ email: account.email, password: account.password }),
    { headers: authHeaders(), tags: { group: "auth" } }
  );
  check(res, { "login 200": (r) => r.status === 200 });
}

// مزج موزون للرحلات الرئيسية
const JOURNEY_WEIGHTS = [
  { weight: 35, value: journeyProjectsList },
  { weight: 25, value: journeyProjectDetail },
  { weight: 20, value: journeyDashboard },
  { weight: 15, value: journeyNotifications },
];

export function mainJourney() {
  const fn = weightedPick(JOURNEY_WEIGHTS);
  fn();
}

export function authJourney() {
  journeyAuth();
}
