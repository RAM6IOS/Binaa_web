const fs = require("fs");
const lineReader = require("readline");

const file = process.argv[2];
const rl = lineReader.createInterface({ input: fs.createReadStream(file) });
const bins = {};
let t0 = null;

rl.on("line", (l) => {
  if (!l.startsWith("{")) return;
  const p = JSON.parse(l);
  if (p.type !== "Point") return;
  const t = Date.parse(p.data.time);
  if (t0 === null) t0 = t;
  const min = Math.floor((t - t0) / 60000);
  const b = (bins[min] = bins[min] || { ssr: [], rest: [], api: [], failed: [], all: 0 });
  if (p.metric === "http_req_duration") {
    const g = p.data.tags.group || "?";
    (b[g] = b[g] || []).push(p.data.value);
  } else if (p.metric === "http_req_failed") {
    b.failed.push(p.data.value);
  }
  if (p.metric === "http_reqs") b.all += p.data.value;
});

rl.on("close", () => {
  const q = (a, pct) => {
    if (!a || !a.length) return null;
    a.sort((x, y) => x - y);
    return a[Math.min(a.length - 1, Math.floor(a.length * pct))];
  };
  const f = (v) =>
    v === null ? "-" : v < 1000 ? Math.round(v) + "ms" : (v / 1000).toFixed(2) + "s";
  const avg = (a) => (a && a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
  console.log(file);
  console.log("min | VU | SSR p95 | REST p95 | API p95 | fail% | req/s");
  for (let m = 0; m <= 25; m++) {
    const b = bins[m];
    if (!b) continue;
    const vu = m < 2 ? 50 : m < 10 ? 100 : 200;
    const failPct = (avg(b.failed) * 100).toFixed(2);
    console.log(
      String(m).padStart(3) + "m | " + String(vu).padStart(3) +
      " | " + f(q(b.ssr, .95)) +
      " | " + f(q(b.rest, .95)) +
      " | " + f(q(b.api, .95)) +
      " | " + failPct +
      " | " + Math.round(b.all / 60)
    );
  }
});
