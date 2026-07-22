"use client";

import React from "react";
import {
  Document, Page, Text, View, StyleSheet, PDFDownloadLink,
} from "@react-pdf/renderer";
import { ContractItemWithProgress, MetresSummary } from "@/lib/types/metres";
import { Project } from "@/lib/types/projects";

// ─── Font Registration ───
let fontsRegistered = false;
function registerFont() {
  if (fontsRegistered) return;
  try {
    const { Font } = require("@react-pdf/renderer");
    Font.register({
      family: "Cairo",
      fonts: [
        { src: "/fonts/Cairo-Variable.ttf", fontWeight: 400 },
        { src: "/fonts/Cairo-Variable.ttf", fontWeight: 700 },
      ],
    });
  } catch {}
  fontsRegistered = true;
}

// ─── Colors ───
const C = {
  primary: "#1e3a5f",
  primaryDark: "#0f2440",
  primaryLight: "#dbeafe",
  accent: "#f59e0b",
  success: "#16a34a",
  danger: "#dc2626",
  white: "#ffffff",
  bg: "#f8fafc",
  border: "#cbd5e1",
  borderLight: "#e2e8f0",
  text: "#1e293b",
  textMuted: "#64748b",
  tableHeader: "#1e3a5f",
  tableAlt: "#f1f5f9",
};

// ─── Styles ───
const styles = StyleSheet.create({
  page: { padding: 0, fontFamily: "Cairo", fontSize: 9, color: C.text, backgroundColor: C.white, direction: "rtl" },
  header: { backgroundColor: C.primaryDark, paddingHorizontal: 28, paddingTop: 22, paddingBottom: 18 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  brandIcon: { width: 36, height: 36, backgroundColor: C.accent, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" },
  brandIconText: { color: C.white, fontSize: 18, fontWeight: "bold" },
  brandName: { fontSize: 22, fontWeight: "bold", color: C.white },
  brandTagline: { fontSize: 8, color: "#93c5fd", marginTop: 2 },
  headerInfo: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", borderTopWidth: 0.5, borderTopColor: "rgba(255,255,255,0.2)", paddingTop: 10 },
  headerInfoItem: { flexDirection: "column", gap: 2 },
  headerInfoLabel: { fontSize: 7, color: "#93c5fd", fontWeight: "bold", textTransform: "uppercase" },
  headerInfoValue: { fontSize: 10, color: C.white, fontWeight: "bold" },
  content: { padding: 24, paddingTop: 18 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: "bold", color: C.primary, marginBottom: 10, paddingBottom: 6, borderBottomWidth: 2, borderBottomColor: C.primary, textAlign: "right" },
  table: { marginBottom: 14, borderWidth: 1, borderColor: C.borderLight, borderRadius: 4 },
  tableHeader: { flexDirection: "row", backgroundColor: C.tableHeader, paddingVertical: 7, paddingHorizontal: 6 },
  tableHeaderText: { color: C.white, fontSize: 7, fontWeight: "bold", textAlign: "right" },
  tableRow: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: C.borderLight },
  tableRowAlt: { backgroundColor: C.tableAlt },
  tableCell: { fontSize: 8, color: C.text, textAlign: "right" },
  tableCellBold: { fontSize: 8, fontWeight: "bold", color: C.text, textAlign: "right" },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.borderLight, paddingHorizontal: 24, paddingVertical: 14 },
  footerBottom: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingTop: 6, borderTopWidth: 0.5, borderTopColor: C.borderLight },
  footerCopyright: { fontSize: 7, color: C.textMuted },
  summaryBox: { flexDirection: "row", justifyContent: "space-around", backgroundColor: C.primaryLight, padding: 14, borderRadius: 6, marginBottom: 16, borderRightWidth: 4, borderRightColor: C.primary },
  summaryItem: { alignItems: "center" },
  summaryLabel: { fontSize: 7, color: C.textMuted, fontWeight: "bold", textTransform: "uppercase", marginBottom: 4 },
  summaryValue: { fontSize: 12, fontWeight: "bold", color: C.primary },
  valueBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.primaryLight, borderRightWidth: 4, borderRightColor: C.primary, padding: 12, borderRadius: 4, marginTop: 10 },
  valueLabel: { fontSize: 10, fontWeight: "bold", color: C.primary, textAlign: "right" },
  valueAmount: { fontSize: 14, fontWeight: "bold", color: C.primary, textAlign: "right" },
});

interface SituationPDFProps {
  items: ContractItemWithProgress[];
  summary: MetresSummary | null;
  project: Project;
  isAr?: boolean;
}

const col = {
  num: "4%", numWide: "5%", art: "7%", desc: "28%", unit: "6%",
  qty: "10%", done: "10%", pct: "10%", bpu: "10%", amount: "10%", rest: "5%",
};

const Td: React.FC<{ width: string; children: React.ReactNode; bold?: boolean; color?: string }> = ({ width, children, bold, color }) => (
  <View style={{ width, padding: 3 }}>
    <Text style={{ fontSize: 8, fontWeight: bold ? "bold" : "normal", color: color || C.text, textAlign: "right" }}>
      {children}
    </Text>
  </View>
);

const SituationDocument: React.FC<SituationPDFProps> = ({ items, summary, project, isAr = false }) => {
  registerFont();
  const t = isAr ? "ar" : "fr";

  return (
    <Document title={`Situation des Travaux - ${project.name}`} author="Binaa Platform" creator="Binaa SaaS">
      <Page size="A4" style={styles.page} wrap orientation="landscape">
        {/* ─── HEADER ─── */}
        <View style={styles.header} fixed>
          <View style={styles.headerRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={styles.brandIcon}><Text style={styles.brandIconText}>B</Text></View>
              <View>
                <Text style={styles.brandName}>Binaa</Text>
                <Text style={styles.brandTagline}>{isAr ? "منصة إدارة مشاريع البناء" : "Plateforme de Gestion"}</Text>
              </View>
            </View>
            <View style={{ backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" }}>
              <Text style={{ color: C.white, fontSize: 9, fontWeight: "bold" }}>
                {isAr ? "SITUATION DES TRAVAUX" : "SITUATION DES TRAVAUX"}
              </Text>
            </View>
          </View>

          <Text style={{ fontSize: 14, fontWeight: "bold", color: C.white, textAlign: "center", marginBottom: 12 }}>
            {isAr ? "وضعية الأشغال - مقاسات الأشغال المنجزة" : "SITUATION DES TRAVAUX - MÉTRÉS"}
          </Text>

          <View style={styles.headerInfo}>
            <View style={styles.headerInfoItem}>
              <Text style={styles.headerInfoLabel}>{isAr ? "المشروع" : "Projet"}</Text>
              <Text style={styles.headerInfoValue}>{project.name}</Text>
            </View>
            <View style={styles.headerInfoItem}>
              <Text style={styles.headerInfoLabel}>{isAr ? "رقم العقد" : "N° Contrat"}</Text>
              <Text style={styles.headerInfoValue}>{project.contract_number || "-"}</Text>
            </View>
            <View style={styles.headerInfoItem}>
              <Text style={styles.headerInfoLabel}>{isAr ? "العميل" : "Client"}</Text>
              <Text style={styles.headerInfoValue}>{project.client_name || "-"}</Text>
            </View>
            <View style={styles.headerInfoItem}>
              <Text style={styles.headerInfoLabel}>{isAr ? "الولاية" : "Wilaya"}</Text>
              <Text style={styles.headerInfoValue}>{project.wilaya}</Text>
            </View>
            <View style={styles.headerInfoItem}>
              <Text style={styles.headerInfoLabel}>{isAr ? "تاريخ الطباعة" : "Date"}</Text>
              <Text style={styles.headerInfoValue}>{new Date().toLocaleDateString(isAr ? "ar-DZ" : "fr-FR")}</Text>
            </View>
          </View>
        </View>

        {/* ─── CONTENT ─── */}
        <View style={styles.content}>
          {/* ─── Summary Box ─── */}
          {summary && (
            <View style={styles.summaryBox}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>{isAr ? "قيمة العقد" : "Valeur contrat"}</Text>
                <Text style={styles.summaryValue}>{summary.total_contract_value.toLocaleString()} DZD</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>{isAr ? "القيمة المنجزة" : "Réalisation"}</Text>
                <Text style={{ fontSize: 12, fontWeight: "bold", color: C.success }}>{summary.total_achieved_value.toLocaleString()} DZD</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>{isAr ? "المتبقي" : "Reste"}</Text>
                <Text style={{ fontSize: 12, fontWeight: "bold", color: C.danger }}>
                  {(summary.total_contract_value - summary.total_achieved_value).toLocaleString()} DZD
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>{isAr ? "نسبة الإنجاز" : "Avancement"}</Text>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: C.primary }}>{summary.overall_progress}%</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>{isAr ? "بنود مكتملة" : "Terminés"}</Text>
                <Text style={{ fontSize: 12, fontWeight: "bold", color: C.accent }}>{summary.completed_items}/{summary.total_items}</Text>
              </View>
            </View>
          )}

          {/* ─── Table ─── */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Td width={col.num} bold>#</Td>
              <Td width={col.art} bold>{isAr ? "رقم البند" : "Art"}</Td>
              <Td width={col.desc} bold>{isAr ? "وصف البند / بيان الأشغال" : "Désignation"}</Td>
              <Td width={col.unit} bold>{isAr ? "الوحدة" : "Unité"}</Td>
              <Td width={col.qty} bold>{isAr ? "الكمية العقدية" : "Qté contrat"}</Td>
              <Td width={col.done} bold>{isAr ? "المنجز" : "Réalisation"}</Td>
              <Td width={col.pct} bold>{isAr ? "النسبة %" : "Progress %"}</Td>
              <Td width={col.bpu} bold>{isAr ? "السعر" : "BPU"}</Td>
              <Td width={col.amount} bold>{isAr ? "المبلغ المنجز" : "Montant réalisé"}</Td>
              <Td width={col.rest} bold>{isAr ? "المتبقي" : "Reste"}</Td>
            </View>

            {items.map((item, i) => (
              <View key={item.id} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Td width={col.num}>{String(i + 1)}</Td>
                <Td width={col.art} bold>{item.item_number}</Td>
                <Td width={col.desc}>{item.designation}</Td>
                <Td width={col.unit}>{item.unit}</Td>
                <Td width={col.qty} bold>{item.quantity.toLocaleString()}</Td>
                <Td width={col.done} bold color={C.success}>{item.total_achieved.toLocaleString()}</Td>
                <Td width={col.pct} bold color={item.progress_percent >= 100 ? C.success : item.progress_percent >= 50 ? C.primary : C.accent}>
                  {item.progress_percent}%
                </Td>
                <Td width={col.bpu}>{item.unit_price.toLocaleString()}</Td>
                <Td width={col.amount} bold color={C.success}>{item.achieved_amount.toLocaleString()}</Td>
                <Td width={col.rest} color={item.remaining_quantity > 0 ? C.danger : C.success}>
                  {item.remaining_quantity > 0 ? item.remaining_quantity.toLocaleString() : "✓"}
                </Td>
              </View>
            ))}
          </View>

          {/* ─── Grand Total ─── */}
          {summary && (
            <View style={styles.valueBox}>
              <Text style={styles.valueLabel}>
                {isAr ? "القيمة الإجمالية المنجزة / إجمالي العقد" : "TOTAL RÉALISÉ / TOTAL CONTRAT"}
              </Text>
              <Text style={styles.valueAmount}>
                {summary.total_achieved_value.toLocaleString()} / {summary.total_contract_value.toLocaleString()} DZD
                {" "}({summary.overall_progress}%)
              </Text>
            </View>
          )}
        </View>

        {/* ─── FOOTER ─── */}
        <View style={styles.footer} fixed>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
            <View style={{ width: "30%" }}>
              <Text style={{ fontSize: 7, fontWeight: "bold", color: C.textMuted, textTransform: "uppercase", marginBottom: 6, textAlign: "right" }}>
                {isAr ? "المدير العام" : "Directeur Général"}
              </Text>
              <View style={{ borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: 4, height: 35 }} />
              <Text style={{ fontSize: 7, color: C.textMuted, textAlign: "right" }}>{isAr ? "التوقيع والختم" : "Signature & Cachet"}</Text>
            </View>
            <View style={{ width: "30%" }}>
              <Text style={{ fontSize: 7, fontWeight: "bold", color: C.textMuted, textTransform: "uppercase", marginBottom: 6, textAlign: "right" }}>
                {isAr ? "مهندس المشاريع" : "Chef de Projet"}
              </Text>
              <View style={{ borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: 4, height: 35 }} />
              <Text style={{ fontSize: 7, color: C.textMuted, textAlign: "right" }}>{isAr ? "توقيع" : "Signature"}</Text>
            </View>
            <View style={{ width: "30%" }}>
              <Text style={{ fontSize: 7, fontWeight: "bold", color: C.textMuted, textTransform: "uppercase", marginBottom: 6, textAlign: "right" }}>
                {isAr ? "المهندس المشرف" : "Ingénieur Référent"}
              </Text>
              <View style={{ borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: 4, height: 35 }} />
              <Text style={{ fontSize: 7, color: C.textMuted, textAlign: "right" }}>{isAr ? "توقيع" : "Signature"}</Text>
            </View>
          </View>
          <View style={styles.footerBottom}>
            <Text style={styles.footerCopyright}>Binaa Platform - {isAr ? "وضعية الأشغال" : "Situation des Travaux"}</Text>
            <Text style={styles.footerCopyright}>{project.name} | {new Date().toLocaleDateString()}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

// ─── Exported Components ───
export function SituationPDFDownload({
  items, summary, project, isAr = false, children,
}: SituationPDFProps & { children: React.ReactNode }) {
  return (
    <PDFDownloadLink
      document={<SituationDocument items={items} summary={summary} project={project} isAr={isAr} />}
      fileName={`Situation_Travaux_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`}
      style={{ textDecoration: "none" }}
    >
      {children}
    </PDFDownloadLink>
  );
}

export default SituationDocument;
