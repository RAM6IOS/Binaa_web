// Stress: تدرج 50 → 100 → 200 مع إيقاف تلقائي عند الانهيار الواضح (abortOnFail)
// تشغيل: k6 run scripts/k6/stress.js

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
      executor: "ramping-vus",
      exec: "mainJourney",
      stages: [
        { duration: "2m", target: 50 },
        { duration: "8m", target: 100 },
        { duration: "8m", target: 200 },
        { duration: "5m", target: 200 },
        { duration: "3m", target: 0 },
      ],
    },
    auth: {
      executor: "per-vu-iterations",
      vus: 2,
      iterations: 1,
      exec: "authJourney",
      startTime: "30s",
    },
  },
  thresholds: {
    // عتبات حاسمة توقف الاختبار فوراً عند انهيار واضح بدل إكمال التشغيل
    http_req_failed: [{ threshold: "rate<0.05", abortOnFail: true }],
    "http_req_duration{group:ssr}": [
      { threshold: "p(95)<8000", abortOnFail: true },
    ],
    "http_req_duration{group:rest}": [
      { threshold: "p(95)<5000", abortOnFail: true },
    ],
    "http_req_duration{group:api}": [{ threshold: "p(95)<5000" }],
    "http_req_duration{group:auth}": [{ threshold: "p(95)<5000" }],
    "http_req_duration{group:assets}": [{ threshold: "p(95)<8000" }],
  },
};

export { mainJourney, authJourney };
