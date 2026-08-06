// Smoke: 10 VUs — التحقق أن كل رحلات المستخدم تعمل وتُنتج المقاييس الصحيحة
// تشغيل: k6 run scripts/k6/smoke.js

import { SharedArray } from "k6/data";
import { baseThresholds } from "./config.js";
import { setSessions, setAccounts } from "./lib/helpers.js";
import { mainJourney, authJourney } from "./lib/journeys.js";

const sessions = new SharedArray("sessions", () =>
  JSON.parse(open("data/tokens.json")).sessions
);
const accounts = new SharedArray("accounts", () =>
  JSON.parse(open("data/accounts.json")).accounts
);
setSessions(sessions);
setAccounts(accounts);

export const options = {
  scenarios: {
    main: {
      executor: "constant-vus",
      vus: 8,
      duration: "90s",
      exec: "mainJourney",
    },
    auth: {
      executor: "per-vu-iterations",
      vus: 2,
      iterations: 1,
      exec: "authJourney",
    },
  },
  thresholds: {
    ...baseThresholds,
    // في الـ smoke نتحقق من التوافر فقط بعتبات مريحة
    "http_req_duration{group:ssr}": ["p(95)<3000"],
    "http_req_duration{group:rest}": ["p(95)<2000"],
    "http_req_duration{group:api}": ["p(95)<1200"],
    "http_req_duration{group:auth}": ["p(95)<3000"],
  },
};

export { mainJourney, authJourney };
