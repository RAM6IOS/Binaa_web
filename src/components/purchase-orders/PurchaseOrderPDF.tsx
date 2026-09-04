"use client";

import React from "react";
import {
  Document, Page, Text, View, StyleSheet, PDFDownloadLink,
} from "@react-pdf/renderer";
import { PurchaseOrderStatus, PurchaseOrderWithItems } from "@/lib/types/purchase-orders";
import { CompanyInfo } from "@/lib/services/company-info";

// ─── Font Registration ───
// Cairo يُستخدم للنص العربي فقط؛ الفرنسية تستعمل Helvetica المدمج (Latin-1 سليم).
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

// ─── Colors — وثيقة إدارية أبيض/أسود فقط ───
const C = {
  black: "#111111",
  dark: "#333333",
  mid: "#555555",
  muted: "#777777",
  lightest: "#EEEEEE",
  white: "#ffffff",
};

// ─── Styles ───
const styles = StyleSheet.create({
  page: { paddingHorizontal: 46, paddingTop: 38, paddingBottom: 62, fontFamily: "Cairo", fontSize: 9, color: C.black, backgroundColor: C.white },
  pageRtl: { direction: "rtl" },
  pageLtr: { direction: "ltr" },
  headerBlock: { marginBottom: 2 },
  companyName: { fontSize: 16, fontWeight: "bold", color: C.black },
  brandLine: { fontSize: 8, color: C.black, marginTop: 1 },
  titleBlock: { marginTop: 16, marginBottom: 18, alignItems: "center" },
  docTitle: { fontSize: 20, fontWeight: "bold", color: C.black },
  titleRule: { width: "100%", borderBottomWidth: 1, borderBottomColor: C.black, marginTop: 7 },
  sectionLabel: { fontSize: 10, fontWeight: "bold", color: C.black, borderBottomWidth: 0.8, borderBottomColor: C.black, paddingBottom: 3, marginBottom: 8 },
  refBlock: { marginBottom: 14 },
  refRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3, flexWrap: "wrap", gap: 8 },
  refItem: { flexDirection: "row", gap: 4 },
  refLabel: { fontSize: 8.5, fontWeight: "bold", color: C.dark },
  refValue: { fontSize: 8.5, color: C.black },
  supplierBox: { borderWidth: 1, borderColor: C.black, padding: 10, marginBottom: 14 },
  supplierName: { fontSize: 11, fontWeight: "bold", color: C.black, marginBottom: 2 },
  supplierLine: { fontSize: 9, color: C.black, marginTop: 1 },
  datesRow: { flexDirection: "row", justifyContent: "space-between", gap: 18, marginBottom: 14, flexWrap: "wrap" },
  dateItem: { flexDirection: "row", gap: 4 },
  notesBlock: { marginBottom: 14 },
  table: { marginBottom: 12, borderWidth: 0.8, borderColor: C.black },
  tableHeader: { flexDirection: "row", backgroundColor: C.lightest },
  tableRow: { flexDirection: "row" },
  totalsBlock: { width: "56%", alignSelf: "flex-end", marginBottom: 16 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalsLabel: { fontSize: 8.5, fontWeight: "bold", color: C.dark },
  totalsValue: { fontSize: 9, color: C.black },
  totalsTtcLabel: { fontSize: 10, fontWeight: "bold", color: C.black },
  totalsTtcValue: { fontSize: 11, fontWeight: "bold", color: C.black },
  ttcRule: { borderTopWidth: 0.8, borderTopColor: C.black, marginTop: 4, paddingTop: 5 },
  signatures: { flexDirection: "row", justifyContent: "space-between", gap: 16 },
  signBox: { width: "48%", borderWidth: 1, borderColor: C.black, padding: 12 },
  signTitle: { fontSize: 9, fontWeight: "bold", color: C.black },
  signSubtitle: { fontSize: 7.5, color: C.mid, marginTop: 1, marginBottom: 10 },
  signSpace: { height: 52 },
  signLine: { borderBottomWidth: 1, borderBottomColor: C.black, paddingBottom: 1 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: C.white, paddingHorizontal: 46, paddingBottom: 26, paddingTop: 9, borderTopWidth: 0.8, borderTopColor: C.black },
  footerNote: { fontSize: 7.5, color: C.mid, marginBottom: 3 },
  footerBottom: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  footerCopyright: { fontSize: 7.5, color: C.muted },
});

const statusLabels: Record<PurchaseOrderStatus, { ar: string; fr: string }> = {
  draft: { ar: 'مسودة', fr: 'Brouillon' },
  sent: { ar: 'مُرسل', fr: 'Envoyé' },
  partial: { ar: 'جزئي', fr: 'Partiel' },
  received: { ar: 'تم الاستلام', fr: 'Reçu' },
  cancelled: { ar: 'ملغى', fr: 'Annulé' },
};

const fmtDate = (d?: string | null): string | null => {
  if (!d) return null;
  const date = new Date(d + (d.length === 10 ? 'T00:00:00' : ''));
  if (Number.isNaN(date.getTime())) return d;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

// تطبيع المسافات الرقمية التي ينتجها Intl (غير معرّفة في الخطوط) إلى مسافة عادية.
const normalizeSpacing = (v: string): string => v.replace(/[\u202F\u00A0\u066C]/g, " ");

// تنسيق موحّد: منزلتان عشريتان دائماً، حسب locale (fr-DZ / ar-DZ)
const fmtMoney = (value: number | null | undefined, isAr: boolean): string => {
  const n = Number(value || 0);
  return `${normalizeSpacing(n.toLocaleString(isAr ? 'ar-DZ' : 'fr-DZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }))} DZD`;
};

// الكمية: منزلتان عند الحاجة فقط (1 → 1، 1.01 → 1.01)
const fmtQty = (value: number | null | undefined, isAr: boolean): string => {
  const n = Number(value || 0);
  return normalizeSpacing(n.toLocaleString(isAr ? 'ar-DZ' : 'fr-DZ', { maximumFractionDigits: 2 }));
};

interface PurchaseOrderPDFProps {
  order: PurchaseOrderWithItems;
  projectName?: string;
  company?: CompanyInfo;
  isAr?: boolean;
}

const col = { num: "5%", desc: "44%", unit: "8%", qty: "9%", price: "15%", amount: "19%" };

const Td: React.FC<{ width: string; children: React.ReactNode; bold?: boolean; center?: boolean; align?: "left" | "right" }> = ({
  width, children, bold, center, align,
}) => (
  <View style={{ width, padding: 4, borderWidth: 0.6, borderColor: C.black }}>
    <Text style={{ fontSize: 8, fontWeight: bold ? "bold" : "normal", color: C.black, textAlign: center ? "center" : (align || "right") }}>
      {children != null ? String(children) : ""}
    </Text>
  </View>
);

const PurchaseOrderDocument: React.FC<PurchaseOrderPDFProps> = ({ order, projectName, company, isAr = false }) => {
  const align = isAr ? "right" : "left";
  const status = statusLabels[order.status];
  const L = (ar: string, fr: string) => (isAr ? ar : fr);

  const brandName = company?.name?.trim() || "Binaa";
  // فقط الحقول غير الفارغة
  const contactLine = [
    company?.phone ? `Tél: ${company.phone}` : "",
    company?.email,
  ].filter(Boolean).join(" | ");
  const legalLine = [
    company?.rc ? `RC: ${company.rc}` : "",
    company?.nif ? `NIF: ${company.nif}` : "",
    company?.nis ? `NIS: ${company.nis}` : "",
    company?.ai ? `AI: ${company.ai}` : "",
  ].filter(Boolean).join(" | ");

  const deliveryText = order.expected_delivery_date
    ? fmtDate(order.expected_delivery_date)
    : L("غير محدد", "Non spécifiée");

  const pad = (n: number) => String(n).padStart(2, "0");
  const now = new Date();
  const printDate = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

  const RefLine: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
    <View style={styles.refItem}>
      <Text style={styles.refLabel}>{label}:</Text>
      <Text style={styles.refValue}>{value && value.length > 0 ? value : "—"}</Text>
    </View>
  );

  return (
    <Document title={`Bon de commande ${order.number}`} author="Binaa Platform" creator="Binaa SaaS">
      <Page size="A4" style={[styles.page, isAr ? styles.pageRtl : styles.pageLtr, { fontFamily: isAr ? "Cairo" : "Helvetica" }]}>
        {/* ─── الرأس: المقاولة + العنوان المسطر ─── */}
        <View style={styles.headerBlock}>
          <Text style={styles.companyName}>{brandName}</Text>
          {company?.address && <Text style={styles.brandLine}>{company.address}</Text>}
          {contactLine && <Text style={styles.brandLine}>{contactLine}</Text>}
          {legalLine && <Text style={styles.brandLine}>{legalLine}</Text>}
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.docTitle}>{L("أمر طلب", "BON DE COMMANDE")}</Text>
          <View style={styles.titleRule} />
        </View>

        {/* ─── المراجع ─── */}
        <View style={styles.refBlock}>
          <View style={styles.refRow}>
            <RefLine label={L("رقم الأمر", "N° BC")} value={order.number} />
            <RefLine label={L("التاريخ", "Date")} value={fmtDate(order.order_date)} />
            <RefLine label={L("الحالة", "Statut")} value={isAr ? status.ar : status.fr} />
          </View>
          <View style={styles.refRow}>
            <RefLine label={L("المشروع / الورشة", "Projet / Chantier")} value={projectName} />
          </View>
        </View>

        {/* ─── المورّد ─── */}
        <Text style={styles.sectionLabel}>{L("المورّد", "Fournisseur")}</Text>
        <View style={styles.supplierBox}>
          <Text style={styles.supplierName}>{order.supplier_name || "—"}</Text>
          {order.supplier_address && <Text style={styles.supplierLine}>{order.supplier_address}</Text>}
          {order.supplier_phone && <Text style={styles.supplierLine}>{L("هاتف", "Tél")}: {order.supplier_phone}</Text>}
        </View>

        {/* ─── التواريخ ─── */}
        <View style={styles.datesRow}>
          <RefLine label={L("تاريخ الأمر", "Date de commande")} value={fmtDate(order.order_date)} />
          <RefLine label={L("التسليم المتوقع", "Livraison souhaitée")} value={deliveryText} />
        </View>
        {order.notes && (
          <View style={styles.notesBlock}>
            <RefLine label={L("ملاحظات / شروط", "Notes / Conditions")} value={order.notes} />
          </View>
        )}

        {/* ─── جدول البنود ─── */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Td width={col.num} bold center>#</Td>
            <Td width={col.desc} bold align={align}>{L("التعيين", "Désignation")}</Td>
            <Td width={col.unit} bold center>{L("الوحدة", "Unité")}</Td>
            <Td width={col.qty} bold>{L("الكمية", "Quantité")}</Td>
            <Td width={col.price} bold>{L("سعر الوحدة", "P.U. HT")}</Td>
            <Td width={col.amount} bold>{L("المبلغ", "Montant HT")}</Td>
          </View>

          {order.items.map((item, i) => (
            <View key={item.id} style={styles.tableRow}>
              <Td width={col.num} center>{String(i + 1)}</Td>
              <Td width={col.desc} align={align}>{item.designation}</Td>
              <Td width={col.unit} center>{item.unit}</Td>
              <Td width={col.qty}>{fmtQty(item.quantity, isAr)}</Td>
              <Td width={col.price}>{fmtMoney(item.unit_price_ht, isAr).replace(/ DZD$/, '')}</Td>
              <Td width={col.amount} bold>{fmtMoney(item.amount_ht, isAr)}</Td>
            </View>
          ))}
        </View>

        {/* ─── المجاميع (محاذاة يمين، بدون صندوق) ─── */}
        {/* TODO(lettres): «Arrêté le présent bon de commande à la somme de : … TTC» عند توفّر تحويل المبلغ إلى حروف. */}
        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>{L("المجموع HT", "Total HT")}</Text>
            <Text style={styles.totalsValue}>{fmtMoney(order.total_ht, isAr)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>{L("الضريبة", "TVA")} ({Number(order.tva_rate ?? 19)}%)</Text>
            <Text style={styles.totalsValue}>{fmtMoney(order.total_tva, isAr)}</Text>
          </View>
          <View style={[styles.totalsRow, styles.ttcRule]}>
            <Text style={styles.totalsTtcLabel}>{L("المجموع TTC", "Total TTC")}</Text>
            <Text style={styles.totalsTtcValue}>{fmtMoney(order.total_ttc, isAr)}</Text>
          </View>
        </View>

        {/* ─── التوقيعات ─── */}
        <View style={styles.signatures}>
          <View style={styles.signBox}>
            <Text style={styles.signTitle}>{L("المقاولة (المصدر)", "L'entreprise (émetteur)")}</Text>
            <Text style={styles.signSubtitle}>{L("الختم والتوقيع", "Cachet et signature")}</Text>
            <View style={styles.signSpace} />
            <View style={styles.signLine} />
          </View>
          <View style={styles.signBox}>
            <Text style={styles.signTitle}>{L("المورّد", "Le fournisseur")}</Text>
            <Text style={styles.signSubtitle}>{L("إشعار بالاستلام", "Accusé de réception")}</Text>
            <View style={styles.signSpace} />
            <View style={styles.signLine} />
          </View>
        </View>

        {/* ─── التذييل ─── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerNote}>
            {L("أمر طلب - وثيقة موجّهة إلى المورّد. هذه الوثيقة ليست فاتورة.", "Bon de commande - document destiné au fournisseur. Ce document n'est pas une facture.")}
          </Text>
          <View style={styles.footerBottom}>
            <Text style={styles.footerCopyright}>Binaa</Text>
            <Text style={styles.footerCopyright}>{L("تاريخ الطباعة", "Imprimé le")}: {printDate}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

// ─── Exported Components ───
export function PurchaseOrderPDFDownload({
  order, projectName, company, isAr = false, children,
}: PurchaseOrderPDFProps & { children: React.ReactNode }) {
  const fileName = `BC_${order.number.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  return (
    <PDFDownloadLink
      document={<PurchaseOrderDocument order={order} projectName={projectName} company={company} isAr={isAr} />}
      fileName={fileName}
      style={{ textDecoration: "none" }}
    >
      {children}
    </PDFDownloadLink>
  );
}

export default PurchaseOrderDocument;