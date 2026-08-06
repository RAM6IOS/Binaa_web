// أدوات مساعدة متوافقة مع بيئة k6 (goja)
// الجلسات والحسابات تُمرَّر عبر setSessions/setAccounts من السكربت الرئيسي

import http from "k6/http";
import { cfg } from "../config.js";

let sessions = [];
let accounts = [];

export function setSessions(arr) {
  sessions = arr;
}
export function getSessions() {
  return sessions;
}
export function setAccounts(arr) {
  accounts = arr;
}
export function getAccounts() {
  return accounts;
}

export function randomSession() {
  if (sessions.length === 0) return null;
  return sessions[Math.floor(Math.random() * sessions.length)];
}

export function randomAccount() {
  if (accounts.length === 0) return null;
  return accounts[Math.floor(Math.random() * accounts.length)];
}

// اختيار عشوائي موزون: entries = [{ weight, value }]
export function weightedPick(entries) {
  let total = 0;
  for (const e of entries) total += e.weight;
  let r = Math.random() * total;
  for (const e of entries) {
    r -= e.weight;
    if (r <= 0) return e.value;
  }
  return entries[entries.length - 1].value;
}

// ترويسات طلبات Supabase REST (apikey + Bearer)
export function restHeaders(accessToken) {
  return {
    apikey: cfg.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

export function authHeaders() {
  return {
    apikey: cfg.SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
  };
}

// استخراج روابط الأصول الثابتة من HTML الصفحة
export function collectAssets(html) {
  const urls = [];
  const re = /\/_next\/static\/[^"'\s>]+/g;
  let m;
  while ((m = re.exec(html))) urls.push(m[0]);
  return urls;
}

// محاكاة التخزين المؤقت للمتصفح: كل أصل يُجلب مرة واحدة فقط لكل VU
const fetchedAssets = new Set();

export function fetchAssets(base, html) {
  const urls = collectAssets(html);
  let hits = 0;
  let misses = 0;
  for (const u of urls) {
    if (fetchedAssets.has(u)) {
      hits++;
      continue;
    }
    misses++;
    const res = http.get(`${base}${u}`, { tags: { group: "assets" } });
    if (res.status === 200) fetchedAssets.add(u);
  }
  return { hits, misses };
}
