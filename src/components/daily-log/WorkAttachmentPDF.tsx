"use client";

import React from "react";
import {
  Document, Page, Text, View, StyleSheet, PDFDownloadLink,
} from "@react-pdf/renderer";
import { WorkAttachmentWithItems } from "@/lib/types/work-attachments";
import { Project } from "@/lib/types/projects";

let fontsRegistered = false;
try {
  if (!fontsRegistered) {
    const { Font } = require("@react-pdf/renderer");
    Font.register({
      family: "Cairo",
      fonts: [
        { src: "/fonts/Cairo-Variable.ttf", fontWeight: 400 },
        { src: "/fonts/Cairo-Variable.ttf", fontWeight: 700 },
      ],
    });
    fontsRegistered = true;
  }
} catch (e) {
  console.error("Font registration error:", e);
}

// ─── Official Administrative Color Palette (Black / White / Dark Slate) ───
const C = {
  black: "#000000",
  dark: "#111827",
  border: "#374151",
  borderLight: "#9ca3af",
  bgHeader: "#f3f4f6",
  bgAlt: "#f9fafb",
  white: "#ffffff",
  text: "#1f2937",
  textMuted: "#4b5563",
  danger: "#b91c1c",
};

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontFamily: "Cairo",
    fontSize: 7.5,
    color: C.text,
    backgroundColor: C.white,
    direction: "rtl",
  },
  // ─── Official Administrative Header ───
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1.5,
    borderBottomColor: C.black,
    paddingBottom: 10,
    marginBottom: 12,
  },
  headerLeft: {
    alignItems: "flex-start",
    maxWidth: "40%",
  },
  headerCenter: {
    alignItems: "center",
    maxWidth: "40%",
  },
  headerRight: {
    alignItems: "flex-end",
    maxWidth: "40%",
  },
  republicText: {
    fontSize: 7,
    fontWeight: "bold",
    color: C.dark,
    textAlign: "right",
  },
  companyName: {
    fontSize: 10,
    fontWeight: "bold",
    color: C.dark,
    textAlign: "right",
  },
  companyDetails: {
    fontSize: 6.5,
    color: C.textMuted,
    textAlign: "right",
    marginTop: 1,
  },
  // ─── Document Titles ───
  titleBox: {
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.black,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: C.bgHeader,
  },
  mainTitleFr: {
    fontSize: 12,
    fontWeight: "bold",
    color: C.dark,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  mainTitleAr: {
    fontSize: 13,
    fontWeight: "bold",
    color: C.dark,
    marginTop: 2,
  },
  statusBadge: {
    marginTop: 4,
    fontSize: 7,
    fontWeight: "bold",
    color: C.danger,
    textAlign: "center",
  },
  // ─── Info Box (Grid) ───
  infoBox: {
    borderWidth: 1,
    borderColor: C.black,
    marginBottom: 12,
    padding: 8,
    backgroundColor: C.white,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 3,
  },
  infoItem: {
    flexDirection: "row",
    gap: 4,
  },
  infoLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: C.textMuted,
  },
  infoValue: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: C.dark,
  },
  // ─── Table ───
  table: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.black,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: C.bgHeader,
    borderBottomWidth: 1,
    borderBottomColor: C.black,
    alignItems: "center",
    minHeight: 22,
  },
  tableHeaderText: {
    color: C.dark,
    fontSize: 7,
    fontWeight: "bold",
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: C.borderLight,
    alignItems: "center",
    minHeight: 20,
  },
  tableRowAlt: {
    backgroundColor: C.bgAlt,
  },
  // ─── Notes / Reservations Section ───
  notesBox: {
    borderWidth: 1,
    borderColor: C.black,
    padding: 8,
    marginBottom: 14,
    backgroundColor: C.white,
  },
  notesTitle: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: C.dark,
    marginBottom: 3,
    textAlign: "right",
  },
  notesText: {
    fontSize: 7,
    color: C.text,
    lineHeight: 1.4,
    textAlign: "right",
  },
  // ─── Signatures Block ───
  signaturesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 20,
  },
  signatureBox: {
    width: "31%",
    borderWidth: 1,
    borderColor: C.black,
    padding: 6,
    height: 75,
    backgroundColor: C.white,
    justifyContent: "space-between",
  },
  signatureTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: C.dark,
    textAlign: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: C.borderLight,
    paddingBottom: 3,
  },
  signatureFooter: {
    fontSize: 6,
    color: C.textMuted,
    textAlign: "center",
  },
  // ─── Footer ───
  footer: {
    position: "absolute",
    bottom: 15,
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: C.borderLight,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 6,
    color: C.textMuted,
  },
});

interface WorkAttachmentPDFProps {
  attachment: WorkAttachmentWithItems;
  project: Project;
  isAr?: boolean;
}

// Column widths totaling 100%
const col = {
  num: "5%",
  art: "10%",
  desc: "31%",
  unit: "7%",
  contractQty: "11%",
  prevQty: "12%",
  periodQty: "12%",
  cumQty: "12%",
};

const Td = ({
  width,
  children,
  bold,
  align = "right",
}: {
  width: string;
  children: React.ReactNode;
  bold?: boolean;
  align?: "right" | "center" | "left";
}) => (
  <View
    style={{
      width,
      paddingHorizontal: 3,
      paddingVertical: 3,
      borderRightWidth: 0.5,
      borderRightColor: C.borderLight,
    }}
  >
    <Text
      style={{
        fontSize: 7,
        fontWeight: bold ? "bold" : "normal",
        color: C.text,
        textAlign: align,
      }}
    >
      {children != null && children !== "" ? String(children) : "-"}
    </Text>
  </View>
);

const Th = ({
  width,
  children,
}: {
  width: string;
  children: React.ReactNode;
}) => (
  <View
    style={{
      width,
      paddingHorizontal: 3,
      paddingVertical: 4,
      borderRightWidth: 0.5,
      borderRightColor: C.black,
    }}
  >
    <Text style={styles.tableHeaderText}>{children}</Text>
  </View>
);

const WorkAttachmentDocument: React.FC<WorkAttachmentPDFProps> = ({
  attachment,
  project,
  isAr = false,
}) => {
  const items = attachment?.items || [];
  const isDraft = attachment?.status !== "validated";

  return (
    <Document
      title={`Attachement_No${attachment?.attachment_number || 1}_${project?.name || ""}`}
      author="Binaa Platform"
      creator="Binaa SaaS"
    >
      <Page size="A4" style={styles.page} wrap orientation="landscape">
        {/* ─── Official Administrative Header ─── */}
        <View style={styles.topHeader} fixed>
          <View style={styles.headerLeft}>
            <Text style={styles.republicText}>
              الجمهورية الجزائرية الديمقراطية الشعبية
            </Text>
            <Text style={styles.republicText}>
              République Algérienne Démocratique et Populaire
            </Text>
          </View>
          <View style={styles.headerCenter}>
            <Text style={{ fontSize: 8, fontWeight: "bold", color: C.dark }}>
              {project?.client_name || "المكتل / صاحب المشروع"}
            </Text>
            <Text style={styles.companyDetails}>Maître d'Ouvrage</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.companyName}>
              {project?.client_name ? `مؤسسة إنجاز الأشغال - ${project.client_name}` : "مؤسسة إنجاز الأشغال"}
            </Text>
            <Text style={styles.companyDetails}>NIF: -------------------</Text>
            <Text style={styles.companyDetails}>RC: -------------------</Text>
          </View>
        </View>

        {/* ─── Titles Box ─── */}
        <View style={styles.titleBox} fixed>
          <Text style={styles.mainTitleFr}>
            ATTACHEMENT MINUTE DES TRAVAUX N° {attachment?.attachment_number || 1}
          </Text>
          <Text style={styles.mainTitleAr}>
            محضر قيس الأشغال رقم {attachment?.attachment_number || 1}
          </Text>
          {isDraft && (
            <Text style={styles.statusBadge}>
              {isAr ? "⚠ مسودة - غير معتمد رسمياً" : "⚠ BROUILLON - NON VALIDÉ"}
            </Text>
          )}
        </View>

        {/* ─── Info Box (Details) ─── */}
        <View style={styles.infoBox} fixed>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{isAr ? "المشروع:" : "Projet :"}</Text>
              <Text style={styles.infoValue}>{project?.name || "-"}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{isAr ? "رقم العقد/الصفقة:" : "N° de Marché / Contrat :"}</Text>
              <Text style={styles.infoValue}>{project?.contract_number || "-"}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{isAr ? "صاحب المشروع:" : "Maître d'Ouvrage :"}</Text>
              <Text style={styles.infoValue}>{project?.client_name || "-"}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{isAr ? "فترة الإنجاز:" : "Période d'exécution :"}</Text>
              <Text style={styles.infoValue}>
                {attachment?.period_start || "---"} → {attachment?.period_end || "---"}
              </Text>
            </View>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{isAr ? "الولاية / الموقع:" : "Wilaya / Lieu :"}</Text>
              <Text style={styles.infoValue}>{project?.wilaya || "-"}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{isAr ? "حالة المحضر:" : "Statut :"}</Text>
              <Text style={styles.infoValue}>
                {attachment?.status === "validated"
                  ? (isAr ? "معتمد رسمياً (Validé)" : "Validé")
                  : (isAr ? "مسودة (Brouillon)" : "Brouillon")}
              </Text>
            </View>
          </View>
        </View>

        {/* ─── Professional Items Table ─── */}
        <View style={styles.table}>
          <View style={styles.tableHeader} fixed>
            <Th width={col.num}>#</Th>
            <Th width={col.art}>{isAr ? "رقم البند" : "Art."}</Th>
            <Th width={col.desc}>{isAr ? "وصف البند / بيان الأشغال" : "Désignation des ouvrages"}</Th>
            <Th width={col.unit}>{isAr ? "الوحدة" : "Unité"}</Th>
            <Th width={col.contractQty}>{isAr ? "كمية العقد" : "Qté Contrat"}</Th>
            <Th width={col.prevQty}>{isAr ? "السابق" : "Antérieur"}</Th>
            <Th width={col.periodQty}>{isAr ? "هذه الفترة" : "Période"}</Th>
            <Th width={col.cumQty}>{isAr ? "التراكمي" : "Cumul"}</Th>
          </View>

          {items.map((item, i) => {
            if (!item) return null;
            return (
              <View
                key={item.id || i}
                style={[
                  styles.tableRow,
                  i % 2 === 1 ? styles.tableRowAlt : {},
                ]}
                wrap={false}
              >
                <Td width={col.num} align="center">
                  {String(i + 1)}
                </Td>
                <Td width={col.art} bold align="center">
                  {item.item_code || "-"}
                </Td>
                <Td width={col.desc}>
                  {item.description || "-"}
                </Td>
                <Td width={col.unit} align="center">
                  {item.unit || "-"}
                </Td>
                <Td width={col.contractQty} align="left">
                  {(item.contracted_qty ?? 0).toLocaleString()}
                </Td>
                <Td width={col.prevQty} align="left">
                  {(item.previous_qty ?? 0).toLocaleString()}
                </Td>
                <Td width={col.periodQty} bold align="left">
                  {(item.period_qty ?? 0).toLocaleString()}
                </Td>
                <Td width={col.cumQty} bold align="left">
                  {(item.cumulative_qty ?? 0).toLocaleString()}
                </Td>
              </View>
            );
          })}
        </View>

        {/* ─── Notes / Reservations Section ─── */}
        {attachment?.notes && (
          <View style={styles.notesBox} wrap={false}>
            <Text style={styles.notesTitle}>
              {isAr ? "ملاحظات وتحفظات محضر القيس:" : "Notes et Observations de l'Attachement :"}
            </Text>
            <Text style={styles.notesText}>{attachment.notes}</Text>
          </View>
        )}

        {/* ─── Signatures Block ─── */}
        <View style={styles.signaturesContainer} wrap={false}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>
              {isAr ? "مقاول البناء (المؤسسة المنفذة)" : "L'Entrepreneur"}
            </Text>
            <Text style={styles.signatureFooter}>
              {isAr ? "التوقيع والختم (Cachet & Signature)" : "Signature & Cachet"}
            </Text>
          </View>

          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>
              {isAr ? "مهندس المشروع (مكتب الدراسات / المتابع)" : "Chef de Projet"}
            </Text>
            <Text style={styles.signatureFooter}>
              {isAr ? "التوقيع (Signature)" : "Signature"}
            </Text>
          </View>

          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>
              {isAr ? "صاحب المشروع (المكتل / الاعتماد)" : "Maître d'Ouvrage (Visa)"}
            </Text>
            <Text style={styles.signatureFooter}>
              {isAr ? "اعتماد وتوقيع (Visa & Signature)" : "Visa & Signature"}
            </Text>
          </View>
        </View>

        {/* ─── Official Footer ─── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Binaa SaaS - {isAr ? "وثيقة رسمية - محضر قيس الأشغال رقم" : "Document Officiel - Attachement N°"} {attachment?.attachment_number || 1} ({project?.name || ""})
          </Text>
          <Text style={styles.footerText}>
            {new Date().toLocaleDateString(isAr ? "ar-DZ" : "fr-FR")}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export function WorkAttachmentPDFDownload({
  attachment,
  project,
  isAr = false,
  children,
}: WorkAttachmentPDFProps & { children: React.ReactNode }) {
  return (
    <PDFDownloadLink
      document={<WorkAttachmentDocument attachment={attachment} project={project} isAr={isAr} />}
      fileName={`Attachement_No${attachment?.attachment_number || 1}_${(project?.name || "project").replace(/\s+/g, "_")}.pdf`}
      style={{ textDecoration: "none" }}
    >
      {children}
    </PDFDownloadLink>
  );
}

export default WorkAttachmentDocument;
