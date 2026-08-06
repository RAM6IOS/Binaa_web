// write-smoke: 5 VUs — التحقق أن الكتابة المحدودة تعمل (إنشاء + قراءة)
// معدل محدود: 1 إنشاء/ث × 3 دقائق = ~180 مهمة [LOADTEST]
// تشغيل: k6 run scripts/k6/write-smoke.js

import { SharedArray } from "k6/data";
import { setSessions, setAccounts } from "./lib/helpers.js";
import { writeTask } from "./lib/write-journeys.js";

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
    write: {
      executor: "constant-arrival-rate",
      rate: 1,
      timeUnit: "1s",
      duration: "3m",
      preAllocatedVUs: 5,
      maxVUs: 5,
      exec: "writeTask",
    },
  },
  thresholds: {
    "http_req_failed{group:write_create}": ["rate<0.05"],
    "http_req_failed{group:write_verify}": ["rate<0.05"],
    "http_req_duration{group:write_create}": ["p(95)<3000"],
    "http_req_duration{group:write_verify}": ["p(95)<3000"],
  },
};

export { writeTask };
