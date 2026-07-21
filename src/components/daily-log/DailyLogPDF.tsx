"use client";

import React, { useEffect, useState } from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
  PDFDownloadLink,
  PDFViewer,
} from "@react-pdf/renderer";
import { DailyLog } from "@/lib/types/daily-logs";
import { Project } from "@/lib/types/projects";

// ═══════════════════════════════════════════════════════════
// ─── Font Registration (Cairo for Arabic) ───
// ═══════════════════════════════════════════════════════════
const FONT_URL = "https://fonts.cdnfonts.com/css/cairo";

let fontsRegistered = false;

function registerCairoFont() {
  if (fontsRegistered) return;

  Font.register({
    family: "Cairo",
    fonts: [
      { src: "/fonts/Cairo-Variable.ttf", fontWeight: 400 },
      { src: "/fonts/Cairo-Variable.ttf", fontWeight: 700 },
    ],
  });

  fontsRegistered = true;
}

// ═══════════════════════════════════════════════════════════
// ─── Props ───
// ═══════════════════════════════════════════════════════════
interface DailyLogPDFProps {
  dailyLog: DailyLog;
  project: Project;
  isAr?: boolean;
}

// ═══════════════════════════════════════════════════════════
// ─── Translation Maps ───
// ═══════════════════════════════════════════════════════════
const weatherMap: Record<string, { ar: string; fr: string }> = {
  sunny: { ar: "مشمس", fr: "Ensoleillé" },
  rainy: { ar: "ممطر", fr: "Pluvieux" },
  cloudy: { ar: "غائم", fr: "Nuageux" },
  stormy: { ar: "عاصف", fr: "Orageux" },
  windy: { ar: "عالي الرياح", fr: "Venteux" },
  foggy: { ar: "ضبابي", fr: "Brumeux" },
};

const siteStatusMap: Record<string, { ar: string; fr: string; color: string }> = {
  active: { ar: "نشطة", fr: "Active", color: "#16a34a" },
  in_progress: { ar: "في تقدم", fr: "En cours", color: "#2563eb" },
  delayed: { ar: "مؤجلة", fr: "Retardée", color: "#d97706" },
  inactive: { ar: "متوقفة", fr: "Inactive", color: "#dc2626" },
  completed: { ar: "مكتملة", fr: "Terminée", color: "#7c3aed" },
};

const statusMap: Record<string, { ar: string; fr: string }> = {
  draft: { ar: "مسودة", fr: "Brouillon" },
  pending: { ar: "قيد المراجعة", fr: "En attente" },
  validated: { ar: "معتمد", fr: "Validé" },
};

const workerStatusMap: Record<string, { ar: string; fr: string }> = {
  present: { ar: "حاضر", fr: "Présent" },
  overtime: { ar: "إضافي", fr: "Supplément" },
  half_day: { ar: "نصف يوم", fr: "Demi-journée" },
  absent: { ar: "غائب", fr: "Absent" },
};

// ═══════════════════════════════════════════════════════════
// ─── Colors ───
// ═══════════════════════════════════════════════════════════
const C = {
  primary: "#1e3a5f",
  primaryDark: "#0f2440",
  primaryLight: "#dbeafe",
  accent: "#f59e0b",
  accentLight: "#fef3c7",
  success: "#16a34a",
  danger: "#dc2626",
  warning: "#d97706",
  bg: "#f8fafc",
  white: "#ffffff",
  border: "#cbd5e1",
  borderLight: "#e2e8f0",
  text: "#1e293b",
  textMuted: "#64748b",
  tableHeader: "#1e3a5f",
  tableAlt: "#f1f5f9",
};

// ═══════════════════════════════════════════════════════════
// ─── Styles ───
// ═══════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: "Cairo",
    fontSize: 9,
    color: C.text,
    backgroundColor: C.white,
    direction: "rtl",
  },

  // ─── Header ───
  header: {
    backgroundColor: C.primaryDark,
    paddingHorizontal: 28,
    paddingTop: 22,
    paddingBottom: 18,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  headerBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandIcon: {
    width: 36,
    height: 36,
    backgroundColor: C.accent,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  brandIconText: {
    color: C.white,
    fontSize: 18,
    fontWeight: "bold",
  },
  brandName: {
    fontSize: 22,
    fontWeight: "bold",
    color: C.white,
  },
  brandTagline: {
    fontSize: 8,
    color: "#93c5fd",
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  statusBadgeText: {
    color: C.white,
    fontSize: 9,
    fontWeight: "bold",
  },
  headerInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    borderTopWidth: 0.5,
    borderTopColor: "rgba(255,255,255,0.2)",
    paddingTop: 10,
  },
  headerInfoItem: {
    flexDirection: "column",
    gap: 2,
  },
  headerInfoLabel: {
    fontSize: 7,
    color: "#93c5fd",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  headerInfoValue: {
    fontSize: 10,
    color: C.white,
    fontWeight: "bold",
  },

  // ─── Content ───
  content: {
    padding: 24,
    paddingTop: 18,
  },

  // ─── Section ───
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: C.primary,
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: C.primary,
    textAlign: "right",
  },

  // ─── Info Grid ───
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.borderLight,
    borderRadius: 4,
  },
  infoCard: {
    width: "33.33%",
    padding: 10,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderRightColor: C.borderLight,
    borderBottomColor: C.borderLight,
  },
  infoCardEven: {
    width: "33.33%",
    padding: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: C.borderLight,
  },
  infoLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: C.textMuted,
    textTransform: "uppercase",
    marginBottom: 3,
    textAlign: "right",
  },
  infoValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: C.text,
    textAlign: "right",
  },

  // ─── Tables ───
  table: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.borderLight,
    borderRadius: 4,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: C.tableHeader,
    paddingVertical: 7,
    paddingHorizontal: 6,
  },
  tableHeaderText: {
    color: C.white,
    fontSize: 8,
    fontWeight: "bold",
    textAlign: "right",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: C.borderLight,
  },
  tableRowAlt: {
    backgroundColor: C.tableAlt,
  },
  tableCell: {
    fontSize: 9,
    color: C.text,
    textAlign: "right",
  },
  tableCellBold: {
    fontSize: 9,
    fontWeight: "bold",
    color: C.text,
    textAlign: "right",
  },
  tableCellMuted: {
    fontSize: 8,
    color: C.textMuted,
    textAlign: "right",
  },

  // ─── Badge ───
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 3,
    alignSelf: "flex-end",
  },
  badgeText: {
    fontSize: 8,
    fontWeight: "bold",
    color: C.white,
    textAlign: "center",
  },

  // ─── Text ───
  bodyText: {
    fontSize: 9,
    color: C.text,
    lineHeight: 1.6,
    textAlign: "right",
  },

  // ─── Alert Boxes ───
  alertBox: {
    borderRightWidth: 4,
    padding: 10,
    marginBottom: 10,
    borderRadius: 4,
  },
  alertTitle: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 4,
    textAlign: "right",
  },
  alertText: {
    fontSize: 9,
    lineHeight: 1.5,
    textAlign: "right",
  },

  // ─── Photos ───
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  photoCard: {
    width: "30%",
  },
  photoImage: {
    width: "100%",
    height: 80,
    objectFit: "cover",
    borderRadius: 4,
    marginBottom: 4,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  photoCaption: {
    fontSize: 7,
    color: C.textMuted,
    textAlign: "center",
  },

  // ─── Footer ───
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  footerGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  footerBox: {
    width: "30%",
  },
  footerLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: C.textMuted,
    textTransform: "uppercase",
    marginBottom: 6,
    textAlign: "right",
  },
  footerLine: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    marginBottom: 4,
    height: 35,
  },
  footerValue: {
    fontSize: 8,
    color: C.text,
    textAlign: "right",
  },
  footerBottom: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: C.borderLight,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerCopyright: {
    fontSize: 7,
    color: C.textMuted,
  },

  // ─── Value Box ───
  valueBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.primaryLight,
    borderRightWidth: 4,
    borderRightColor: C.primary,
    padding: 12,
    borderRadius: 4,
    marginBottom: 14,
  },
  valueLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: C.primary,
    textAlign: "right",
  },
  valueAmount: {
    fontSize: 14,
    fontWeight: "bold",
    color: C.primary,
    textAlign: "right",
  },
});

// ═══════════════════════════════════════════════════════════
// ─── Helper: Column widths for tables ───
// ═══════════════════════════════════════════════════════════
const col = {
  full: "100%",
  half: "50%",
  third: "33.33%",
  quarter: "25%",
  fifth: "20%",
  six: "16.66%",
  num: "5%",
  numWide: "6%",
};

// ═══════════════════════════════════════════════════════════
// ─── Table Cell Component ───
// ═══════════════════════════════════════════════════════════
const Td: React.FC<{
  width: string;
  children: React.ReactNode;
  bold?: boolean;
  muted?: boolean;
}> = ({ width, children, bold, muted }) => (
  <View style={{ width, padding: 4 }}>
    <Text
      style={
        muted
          ? styles.tableCellMuted
          : bold
          ? styles.tableCellBold
          : styles.tableCell
      }
    >
      {children}
    </Text>
  </View>
);

// ═══════════════════════════════════════════════════════════
// ─── Main PDF Document ───
// ═══════════════════════════════════════════════════════════
const DailyLogPDFDocument: React.FC<DailyLogPDFProps> = ({
  dailyLog: log,
  project,
  isAr = false,
}) => {
  registerCairoFont();

  const weather = weatherMap[log.weather_condition] || weatherMap.sunny;
  const siteStatus = siteStatusMap[log.site_status] || siteStatusMap.active;
  const reportStatus = statusMap[log.status] || statusMap.draft;
  const t = isAr ? "ar" : "fr";

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(isAr ? "ar-DZ" : "fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Document
      title={`Rapport Journalier - ${log.log_date}`}
      author="Binaa Platform"
      subject="Daily Construction Report"
      creator="Binaa SaaS"
    >
      <Page size="A4" style={styles.page} wrap>
        {/* ═══ HEADER ═══ */}
        <View style={styles.header} fixed>
          <View style={styles.headerRow}>
            <View style={styles.headerBrand}>
              <View style={styles.brandIcon}>
                <Text style={styles.brandIconText}>B</Text>
              </View>
              <View>
                <Text style={styles.brandName}>Binaa</Text>
                <Text style={styles.brandTagline}>
                  {isAr ? "منصة إدارة مشاريع البناء" : "Plateforme de Gestion de Construction"}
                </Text>
              </View>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>
                {reportStatus[t]}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text
            style={{
              fontSize: 16,
              fontWeight: "bold",
              color: C.white,
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            {isAr ? "تقرير يومي للأشغال" : "RAPPORT JOURNALIER DES TRAVAUX"}
          </Text>

          <View style={styles.headerInfo}>
            <View style={styles.headerInfoItem}>
              <Text style={styles.headerInfoLabel}>
                {isAr ? "المشروع" : "Projet"}
              </Text>
              <Text style={styles.headerInfoValue}>{project.name}</Text>
            </View>
            <View style={styles.headerInfoItem}>
              <Text style={styles.headerInfoLabel}>
                {isAr ? "التاريخ" : "Date"}
              </Text>
              <Text style={styles.headerInfoValue}>{log.log_date}</Text>
            </View>
            <View style={styles.headerInfoItem}>
              <Text style={styles.headerInfoLabel}>
                {isAr ? "الولاية" : "Wilaya"}
              </Text>
              <Text style={styles.headerInfoValue}>{project.wilaya}</Text>
            </View>
            <View style={styles.headerInfoItem}>
              <Text style={styles.headerInfoLabel}>
                {isAr ? "رقم التقرير" : "N° Rapport"}
              </Text>
              <Text style={styles.headerInfoValue}>
                {log.log_date.replace(/-/g, "").slice(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* ═══ CONTENT ═══ */}
        <View style={styles.content}>
          {/* ── معلومات التقرير ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {isAr ? "معلومات التقرير" : "INFORMATIONS DU RAPPORT"}
            </Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>{isAr ? "التاريخ" : "Date"}</Text>
                <Text style={styles.infoValue}>{formatDate(log.log_date)}</Text>
              </View>
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>{isAr ? "الطقس" : "Météo"}</Text>
                <Text style={styles.infoValue}>{weather[t]}</Text>
              </View>
              <View style={styles.infoCardEven}>
                <Text style={styles.infoLabel}>{isAr ? "الحرارة" : "Température"}</Text>
                <Text style={styles.infoValue}>
                  {log.temperature}°C
                  {log.temperature_min != null ? ` / ${log.temperature_min}°C` : ""}
                </Text>
              </View>
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>{isAr ? "حالة الورشة" : "État du chantier"}</Text>
                <View style={{ ...styles.badge, backgroundColor: siteStatus.color, marginTop: 2 }}>
                  <Text style={styles.badgeText}>{siteStatus[t]}</Text>
                </View>
              </View>
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>{isAr ? "نسبة الإنجاز" : "Progrès"}</Text>
                <Text style={{ ...styles.infoValue, color: C.primary, fontSize: 14 }}>
                  %{log.overall_progress}
                </Text>
              </View>
              <View style={styles.infoCardEven}>
                <Text style={styles.infoLabel}>{isAr ? "الموقع" : "Localisation"}</Text>
                <Text style={styles.infoValue}>{log.location_details || "-"}</Text>
              </View>
            </View>
          </View>

          {/* ── ملخص الأعمال ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {isAr ? "ملخص الأعمال المنجزة" : "RÉSUMÉ DES TRAVAUX"}
            </Text>
            <Text style={styles.bodyText}>{log.work_summary}</Text>
          </View>

          {/* ── العمال الحاضرون ── */}
          {log.workers_present && log.workers_present.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {isAr ? `العمال الحاضرون (${log.workers_present.length})` : `EFFECTIFS PRÉSENTS (${log.workers_present.length})`}
              </Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Td width="5%" bold>#</Td>
                  <Td width="35%" bold>{isAr ? "الاسم" : "Nom"}</Td>
                  <Td width="25%" bold>{isAr ? "المهنة" : "Poste"}</Td>
                  <Td width="15%" bold>{isAr ? "الساعات" : "Heures"}</Td>
                  <Td width="20%" bold>{isAr ? "الحالة" : "Statut"}</Td>
                </View>
                {log.workers_present.map((w, i) => (
                  <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                    <Td width="5%">{String(i + 1)}</Td>
                    <Td width="35%" bold>{w.worker_name}</Td>
                    <Td width="25%">{w.job_title || "-"}</Td>
                    <Td width="15%" bold>{w.hours_worked}H</Td>
                    <Td width="20%">
                      {workerStatusMap[w.status || "present"]?.[t] || (isAr ? "حاضر" : "Présent")}
                    </Td>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── العتاد المستخدم ── */}
          {log.equipment_used && log.equipment_used.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {isAr ? `العتاد المستخدم (${log.equipment_used.length})` : `ENGINS UTILISÉS (${log.equipment_used.length})`}
              </Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Td width="5%" bold>#</Td>
                  <Td width="45%" bold>{isAr ? "المعدة" : "Engin"}</Td>
                  <Td width="20%" bold>{isAr ? "الساعات" : "Heures"}</Td>
                  <Td width="30%" bold>{isAr ? "ملاحظات" : "Observations"}</Td>
                </View>
                {log.equipment_used.map((e, i) => (
                  <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                    <Td width="5%">{String(i + 1)}</Td>
                    <Td width="45%" bold>{e.equipment_name}</Td>
                    <Td width="20%" bold>{e.usage_hours}H</Td>
                    <Td width="30%">
                      {e.usage_hours <= 4
                        ? isAr ? "استهلاك منخفض" : "Faible"
                        : e.usage_hours <= 8
                        ? isAr ? "استهلاك عادي" : "Normal"
                        : isAr ? "استهلاك مرتفع" : "Élevé"}
                    </Td>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── الكميات المنجزة ── */}
          {log.quantities && log.quantities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {isAr ? `الكميات المنجزة (${log.quantities.length})` : `QUANTITÉS RÉALISÉES (${log.quantities.length})`}
              </Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Td width="5%" bold>#</Td>
                  <Td width="40%" bold>{isAr ? "بيان الأشغال" : "Désignation"}</Td>
                  <Td width="15%" bold>{isAr ? "الكمية" : "Qté"}</Td>
                  <Td width="15%" bold>{isAr ? "الوحدة" : "Unité"}</Td>
                  <Td width="25%" bold>{isAr ? "رقم البند" : "N° Article"}</Td>
                </View>
                {log.quantities.map((q, i) => (
                  <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                    <Td width="5%">{String(i + 1)}</Td>
                    <Td width="40%" bold>{q.description}</Td>
                    <Td width="15%" bold>{String(q.achieved_quantity)}</Td>
                    <Td width="15%">{q.unit}</Td>
                    <Td width="25%">{q.bpu_item || "-"}</Td>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── المواد المستهلكة ── */}
          {log.materials && log.materials.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {isAr ? `المواد المستهلكة (${log.materials.length})` : `MATÉRIAUX CONSOMMÉS (${log.materials.length})`}
              </Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Td width="5%" bold>#</Td>
                  <Td width="40%" bold>{isAr ? "المادة" : "Matériau"}</Td>
                  <Td width="15%" bold>{isAr ? "الكمية" : "Qté"}</Td>
                  <Td width="15%" bold>{isAr ? "الوحدة" : "Unité"}</Td>
                  <Td width="25%" bold>{isAr ? "ملاحظات" : "Notes"}</Td>
                </View>
                {log.materials.map((m, i) => (
                  <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                    <Td width="5%">{String(i + 1)}</Td>
                    <Td width="40%" bold>{m.material_name}</Td>
                    <Td width="15%" bold>{String(m.quantity)}</Td>
                    <Td width="15%">{m.unit}</Td>
                    <Td width="25%">{m.notes || "-"}</Td>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── الصور الميدانية ── */}
          {log.photos && log.photos.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {isAr ? `الصور الميدانية (${log.photos.length})` : `PHOTOS DU TERRAIN (${log.photos.length})`}
              </Text>
              <View style={styles.photoGrid}>
                {log.photos.slice(0, 6).map((p, i) => (
                  <View key={i} style={styles.photoCard}>
                    {p.url ? (
                      <Image src={p.url} style={styles.photoImage} />
                    ) : (
                      <View
                        style={{
                          ...styles.photoImage,
                          backgroundColor: C.tableAlt,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ color: C.textMuted, fontSize: 8 }}>
                          {isAr ? "صورة" : "Photo"}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.photoCaption}>
                      {p.caption || `${isAr ? "صورة" : "Photo"} ${i + 1}`}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── المشاكل والملاحظات ── */}
          {(log.problems_faced || log.notes) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {isAr ? "المشاكل والملاحظات" : "PROBLÈMES & NOTES"}
              </Text>
              {log.problems_faced && (
                <View
                  style={{
                    ...styles.alertBox,
                    backgroundColor: "#fef2f2",
                    borderRightColor: C.danger,
                  }}
                >
                  <Text style={{ ...styles.alertTitle, color: C.danger }}>
                    {isAr ? "⚠ عقبات ميدانية" : "⚠ Incidents"}
                  </Text>
                  <Text style={{ ...styles.alertText, color: "#991b1b" }}>
                    {log.problems_faced}
                  </Text>
                </View>
              )}
              {log.notes && (
                <View
                  style={{
                    ...styles.alertBox,
                    backgroundColor: "#f0f9ff",
                    borderRightColor: C.primary,
                  }}
                >
                  <Text style={{ ...styles.alertTitle, color: C.primary }}>
                    {isAr ? "📝 ملاحظات وتوصيات" : "📝 Notes & Recommandations"}
                  </Text>
                  <Text style={{ ...styles.alertText, color: "#1e3a5f" }}>
                    {log.notes}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ── القيمة التقديرية ── */}
          {log.estimated_value > 0 && (
            <View style={styles.valueBox}>
              <Text style={styles.valueLabel}>
                {isAr ? "القيمة التقديرية للإنجاز اليومي" : "Valeur estimée de la journée"}
              </Text>
              <Text style={styles.valueAmount}>
                {log.estimated_value.toLocaleString()} DZD
              </Text>
            </View>
          )}
        </View>

        {/* ═══ FOOTER ═══ */}
        <View style={styles.footer} fixed>
          <View style={styles.footerGrid}>
            <View style={styles.footerBox}>
              <Text style={styles.footerLabel}>
                {isAr ? "المهندس المشرف" : "Ingénieur"}
              </Text>
              <View style={styles.footerLine} />
              <Text style={styles.footerValue}>
                {isAr ? "التوقيع والختم" : "Signature & Cachet"}
              </Text>
            </View>
            <View style={styles.footerBox}>
              <Text style={styles.footerLabel}>
                {isAr ? "مهندس المشاريع" : "Chef de projet"}
              </Text>
              <View style={styles.footerLine} />
              <Text style={styles.footerValue}>{isAr ? "توقيع" : "Signature"}</Text>
            </View>
            <View style={styles.footerBox}>
              <Text style={styles.footerLabel}>
                {isAr ? "تاريخ الطباعة" : "Date d'impression"}
              </Text>
              <View style={styles.footerLine} />
              <Text style={styles.footerValue}>
                {new Date().toLocaleDateString(isAr ? "ar-DZ" : "fr-FR")}
              </Text>
            </View>
          </View>
          <View style={styles.footerBottom}>
            <Text style={styles.footerCopyright}>
              Binaa Platform - {isAr ? "تقرير يومي رقمي" : "Rapport Numérique"}
            </Text>
            <Text style={styles.footerCopyright}>{log.log_date}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

// ═══════════════════════════════════════════════════════════
// ─── Exported Components ───
// ═══════════════════════════════════════════════════════════

/** رابط تحميل PDF */
export function DailyLogPDFDownload({
  dailyLog,
  project,
  isAr = false,
  children,
}: DailyLogPDFProps & { children: React.ReactNode }) {
  return (
    <PDFDownloadLink
      document={
        <DailyLogPDFDocument dailyLog={dailyLog} project={project} isAr={isAr} />
      }
      fileName={`Rapport_${dailyLog.log_date}.pdf`}
      style={{ textDecoration: "none" }}
    >
      {children}
    </PDFDownloadLink>
  );
}

/** معاينة PDF داخل الصفحة */
export function DailyLogPDFPreview({
  dailyLog,
  project,
  isAr = false,
}: DailyLogPDFProps) {
  return (
    <PDFViewer width="100%" height={800} showToolbar={false}>
      <DailyLogPDFDocument dailyLog={dailyLog} project={project} isAr={isAr} />
    </PDFViewer>
  );
}

/** المكون الرئيسي */
export default DailyLogPDFDocument;
