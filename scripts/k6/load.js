// Load: 0→50 VU (5د) ثم ثبات 50 (15د) ثم انحدار — قراءة فقط
// تشغيل: k6 run scripts/k6/load.js

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
        { duration: "5m", target: 50 },
        { duration: "15m", target: 50 },
        { duration: "5m", target: 0 },
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
  thresholds: baseThresholds,
};

export { mainJourney, authJourney };
