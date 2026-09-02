#!/usr/bin/env node
// حارس قواعد التصميم — يمنع عودة الألوان الخام والقيم خارج المقياس.
// التشغيل: npm run check:design
// المرجع: .opencode/references/design-system.md (القسم 11 + جدول التحويل)

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const SRC = join(ROOT, "src");
const ALLOW_FILE = join(ROOT, "scripts", "allowlist.json");

const PALETTES = [
  "slate", "gray", "grey", "zinc", "neutral", "stone",
  "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal",
  "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink",
  "rose", "white", "black",
];
const paletteAlt = PALETTES.join("|");

// ألوان خام: text-blue-600 / bg-slate-900/10 / shadow-blue-500/30 / text-white ...
const colorRe = new RegExp(
  `(?<![\\w-])(?:[\\w-]+:)*(?:bg|text|border|ring|from|to|via|divide|fill|stroke|shadow|outline|decoration|accent|caret|placeholder)-(?:${paletteAlt})(?:-[0-9]{2,3})?(?:\\/[0-9]{1,3})?(?![\\w-])`,
  "g"
);

// أكواد لون صريحة
const hexRe = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const rgbRe = /\b(?:rgb|rgba)\(\s*[0-9.,%\s]+\s*\)/g;
const hslRawRe = /\bhsl\(\s*[0-9.,%\sdeg]+\s*\)/g; // في .ts/.tsx فقط (globals.css تستخدم hsl(var(--..)))

// زوايا خارج المقياس (rounded-xl / 2xl / 3xl والقيم الاعتباطية)
const radiusRe = /(?<![-\w])(?:[\w-]+:)*rounded-(?:xl|2xl|3xl|\[[^\]]*\])/g;

// ظلال خارج المقياس (md فأعلى، والقيم الاعتباطية)
const shadowRe = /(?<![-\w])(?:[\w-]+:)*shadow-(?:md|lg|xl|2xl|3xl|\[[^\]]*\])/g;

// أوزان خط خارج الهرمية
const fontRe = /(?<![-\w])(?:[\w-]+:)*font-(?:black|extrabold)/g;

// قيم اعتباطية: كل class على شكل name-[value] ما عدا الاستثناءات
const arbRe = /(?<![\w-])(?:[\w-]+:)*[\w-]+-\[([^\]]*)\]/g;

// هل القيمة الاعتباطية مسموحة؟ (نسب/وحدات منطقية/متغيرات Radix/محددات)
function allowedArbitrary(content) {
  const c = content.trim();
  if (!c) return true;
  if (/^-?[0-9]+(?:\.[0-9]+)?%$/.test(c)) return true; // 70% / -50%
  if (/^-?[0-9]+(?:\.[0-9]+)?(?:dvh|dvw|svh|svw|lvh|lvw|vh|vw)$/.test(c)) return true; // 90vh
  if (/^[0-9]+(?:\.[0-9]+)?\/[0-9]+(?:\.[0-9]+)?$/.test(c)) return true; // 3/2
  if (/\bfr\b/.test(c)) return true; // grid-cols-[1fr_2fr]
  if (c.includes("calc(")) return true;
  if (c.includes("=") || c.includes("&") || c.includes(".") || c.startsWith("--")) return true; // محددات
  if (/^['"]+.*['"]+$/.test(c)) return true; // content-['']
  if (/^(placeholder|disabled|checked|indeterminate|active|open|closed|selected|unchecked|focus|visible|hover|file)$/.test(c)) return true; // حالات
  return false;
}

// ---------- الاستثناءات ----------
function loadAllowances() {
  if (!existsSync(ALLOW_FILE)) return [];
  const raw = JSON.parse(readFileSync(ALLOW_FILE, "utf8"));
  return raw.allowances || [];
}

function isAllowed(allowances, fileRel, text) {
  for (const a of allowances) {
    if (a.file !== fileRel) continue;
    try {
      if (new RegExp(a.pattern).test(text)) return true;
    } catch {
      // نمط غير صالح يُهمَل
    }
  }
  return false;
}

// ---------- الفحص ----------
const allFindings = [];

function pushFinding(file, line, category, text) {
  allFindings.push({ file, line, category, text });
}

function checkTsFile(file, rel) {
  readFileSync(file, "utf8").split("\n").forEach((line, idx) => {
    const no = idx + 1;
    for (const m of line.matchAll(colorRe)) pushFinding(rel, no, "color", m[0]);
    for (const m of line.matchAll(hexRe)) pushFinding(rel, no, "hex", m[0]);
    for (const m of line.matchAll(rgbRe)) pushFinding(rel, no, "hex", m[0]);
    for (const m of line.matchAll(hslRawRe)) pushFinding(rel, no, "hex", m[0]);
    for (const m of line.matchAll(radiusRe)) pushFinding(rel, no, "radius", m[0]);
    for (const m of line.matchAll(shadowRe)) pushFinding(rel, no, "shadow", m[0]);
    for (const m of line.matchAll(fontRe)) pushFinding(rel, no, "font", m[0]);
    for (const m of line.matchAll(arbRe)) {
      if (!allowedArbitrary(m[1])) pushFinding(rel, no, "arbitrary", m[0]);
    }
  });
}

function checkCssFile(file, rel) {
  readFileSync(file, "utf8").split("\n").forEach((line, idx) => {
    const no = idx + 1;
    for (const m of line.matchAll(hexRe)) pushFinding(rel, no, "hex", m[0]);
    for (const m of line.matchAll(rgbRe)) pushFinding(rel, no, "hex", m[0]);
    for (const m of line.matchAll(radiusRe)) pushFinding(rel, no, "radius", m[0]);
  });
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(p)) checkTsFile(p, relative(ROOT, p));
    else if (p.endsWith(".css")) checkCssFile(p, relative(ROOT, p));
  }
}

const allowances = loadAllowances();
walk(SRC);

const findings = allFindings.filter((v) => !isAllowed(allowances, v.file, v.text));

// ---------- التقرير ----------
function groupBy(list, key) {
  return list.reduce((acc, v) => {
    const k = v[key];
    (acc[k] = acc[k] || []).push(v);
    return acc;
  }, {});
}

const byFile = groupBy(findings, "file");
const byCat = groupBy(findings, "category");
const verifiedCats = groupBy(allFindings, "category");

console.log("== Design tokens guard ==");
console.log(
  `فحص src/** — ملفات بمخالفات: ${Object.keys(groupBy(allFindings, "file")).length} | مخالفات خام: ${allFindings.length} | متبقٍ بعد الاستثناءات: ${findings.length}\n`
);

if (findings.length === 0) {
  console.log("OK — لا توجد مخالفات (ألوان/قيم خارج المقياس).");
  process.exit(0);
}

const catSummary = Object.entries(byCat)
  .sort((a, b) => b[1].length - a[1].length)
  .map(([k, v]) => `${k}: ${v.length}`)
  .join(" · ");
console.log(`بفئات: ${catSummary}\n`);

const worstFiles = Object.entries(byFile).sort((a, b) => b[1].length - a[1].length).slice(0, 25);
for (const [file, items] of worstFiles) {
  const catTotals = groupBy(items, "category");
  const summary = Object.entries(catTotals).map(([k, v]) => ` ${k}×${v.length}`).join(",");
  console.log(`${String(items.length).padStart(4)}×  ${file} [${summary.trim()}]`);
  if (items.length <= 6) {
    for (const v of items) console.log(`              :${String(v.line).padStart(4)}  ${v.text}`);
  }
}

console.log(
  `\nأفضل 3 فئات: ${Object.entries(byCat).sort((a, b) => b[1].length - a[1].length).slice(0, 3).map(([k, v]) => `${k} (${v.length})`).join("، ")}`
);
console.log("> أعد الألوان عبر الـ tokens (جدول التحويل في design-system.md).");
console.log("> الاستثناءات المبررة فقط: سجّلها في scripts/allowlist.json مع السبب.");
process.exitCode = 1;