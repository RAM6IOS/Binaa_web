// write-load: ضغط كتابة خفيف — 12 VUs كحد أقصى
// معدل محدود: 3 إنشاء/ث × 4 دقائق = ~720 مهمة [LOADTEST]
// تشغيل: k6 run scripts/k6/write-load.js

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
      rate: 3,
      timeUnit: "1s",
      duration: "4m",
      preAllocatedVUs: 12,
      maxVUs: 15,
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
