// رحلة كتابة محدودة: إنشاء مهمة [LOADTEST] على المشروع التجريبي ثم قراءة للتأكد
// قيد أمان: الكتابة على أول مشروع فقط لكل حساب (أصغر أثر)، والوسم في العنوان/الملاحظات للتنظيف لاحقاً

import http from "k6/http";
import { check } from "k6";
import { cfg } from "../config.js";
import { randomSession, restHeaders } from "./helpers.js";

export const LOADTEST_TAG = "[LOADTEST]";

export function writeTask() {
  const s = randomSession();
  if (!s) return;
  if (!s.projectIds || s.projectIds.length === 0) return;

  // مشروع اختبار واحد ثابت لكل حساب — لا لمس لأي مشروع آخر
  const projectId = s.projectIds[0];

  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const payload = {
    title: `${LOADTEST_TAG} k6 write ${now}`,
    description: `${LOADTEST_TAG} اختبار أداء k6 — كتابة محدودة`,
    priority: "low",
    status: "todo",
    start_date: today,
    due_date: today,
    progress: 0,
    assigned_to: null,
    estimated_hours: 0,
    notes: `${LOADTEST_TAG} created by load test`,
    project_id: projectId,
  };

  const createHeaders = {
    ...restHeaders(s.accessToken),
    Prefer: "return=representation",
  };

  const create = http.post(
    `${cfg.REST}/tasks?select=id,title`,
    JSON.stringify(payload),
    { headers: createHeaders, tags: { group: "write_create" } }
  );

  const createdOk = check(create, {
    "task create 201": (r) => r.status === 201,
  });

  if (createdOk) {
    const row = create.json();
    const createdId = Array.isArray(row) ? row[0]?.id : row?.id;
    if (createdId) {
      const verify = http.get(
        `${cfg.REST}/tasks?select=id,title&id=eq.${createdId}`,
        { headers: restHeaders(s.accessToken), tags: { group: "write_verify" } }
      );
      check(verify, {
        "task read-back 200": (r) => r.status === 200,
        "task tagged [LOADTEST]": (r) => {
          const d = r.json();
          const v = Array.isArray(d) ? d[0] : d;
          return !!(v && v.title && v.title.includes(LOADTEST_TAG));
        },
      });
    }
  }
}
