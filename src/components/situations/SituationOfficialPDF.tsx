// ═══════════════════════════════════════════════════════════════════
// الوضعية الرسمية للأشغال (SITUATION DE TRAVAUX — النموذج الجزائري الرسمي) - PDF
// ═══════════════════════════════════════════════════════════════════

import React from "react";
import {
  Document, Page, Text, View, StyleSheet, PDFDownloadLink,
} from "@react-pdf/renderer";
import { WorkSituationWithItems } from "@/lib/types/situations";

// ─── Font Registration ───
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

// ─── Administrative Official Styles (Strict Black & White / Clean Admin) ───
const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontFamily: "Cairo",
    fontSize: 7.5,
    color: "#000000",
    backgroundColor: "#ffffff",
    direction: "ltr",
  },
  headerCenter: {
    alignItems: "center",
    marginBottom: 8,
  },
  republicText: {
    fontSize: 9,
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "uppercase",
  },
  wilayaText: {
    fontSize: 8.5,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 2,
  },
  titleBox: {
    borderWidth: 1.2,
    borderColor: "#000",
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignItems: "center",
    marginVertical: 6,
  },
  mainTitle: {
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "uppercase",
  },
  subTitle: {
    fontSize: 7.5,
    textAlign: "center",
    marginTop: 2,
  },
  gridTwo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    gap: 8,
  },
  box: {
    borderWidth: 1,
    borderColor: "#000",
    padding: 5,
    flex: 1,
  },
  boxTitle: {
    fontSize: 7.5,
    fontWeight: "bold",
    borderBottomWidth: 0.5,
    borderBottomColor: "#000",
    paddingBottom: 2,
    marginBottom: 3,
    backgroundColor: "#f1f5f9",
    textTransform: "uppercase",
  },
  rowText: {
    fontSize: 7,
    marginBottom: 2,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    fontWeight: "bold",
  },
  table: {
    borderWidth: 1,
    borderColor: "#000",
    marginBottom: 6,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  tableHeaderText: {
    fontSize: 7,
    fontWeight: "bold",
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#cbd5e1",
    paddingVertical: 2.5,
    paddingHorizontal: 4,
  },
  tableCell: {
    fontSize: 7,
    textAlign: "center",
  },
  signaturesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  signatureBox: {
    width: "31%",
    borderWidth: 1,
    borderColor: "#000",
    padding: 5,
    height: 65,
    justifyContent: "space-between",
  },
  signatureTitle: {
    fontSize: 7,
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "uppercase",
  },
  versoSection: {
    borderWidth: 1,
    borderColor: "#000",
    padding: 8,
    marginBottom: 8,
  },
  versoTitle: {
    fontSize: 8.5,
    fontWeight: "bold",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingBottom: 3,
    marginBottom: 5,
    textTransform: "uppercase",
  },
});

interface SituationPDFProps {
  situation: WorkSituationWithItems;
  isAr?: boolean;
}

const SituationOfficialPDFDocument: React.FC<SituationPDFProps> = ({ situation }) => {
  return (
    <Document title={`Situation N° ${situation.situation_number} - ${situation.project_name}`} author="Binaa Platform">
      {/* ──────────────────────────────────────────────────────── */}
      {/* ── الصفحة 1: Recto (PARTIE CO-CONTRACTANT) ── */}
      {/* ──────────────────────────────────────────────────────── */}
      <Page size="A4" style={styles.page}>
        {/* رأس الجمهورية */}
        <View style={styles.headerCenter}>
          <Text style={styles.republicText}>République Algérienne Démocratique et Populaire</Text>
          <Text style={styles.wilayaText}>Wilaya de {situation.wilaya || "Algérie"}</Text>
        </View>

        {/* عنوان الوثيقة الرسمي */}
        <View style={styles.titleBox}>
          <Text style={styles.mainTitle}>SITUATION DES TRAVAUX</Text>
          <Text style={styles.subTitle}>
            Situation N° {situation.situation_number} — Arrêtée au {situation.arretee_au} ({situation.situation_type === "monthly" ? "Mensuelle" : situation.situation_type === "final" ? "Finale" : "Intérimaire"})
          </Text>
        </View>

        {/* معلومات الأطراف والصفقة (نموذج إداري جزائري رسمي) */}
        <View style={styles.gridTwo}>
          {/* 1. المصلحة المتعاقدة والصفقة (Service Contractant & Marché) */}
          <View style={styles.box}>
            <Text style={styles.boxTitle}>1. Service Contractant & Marché</Text>
            <Text style={styles.rowText}>
              <Text style={styles.label}>Maître d'Ouvrage:</Text> {situation.client_name || "Service Contractant"}
            </Text>
            {situation.maitre_oeuvre && (
              <Text style={styles.rowText}>
                <Text style={styles.label}>Maître d'Œuvre:</Text> {situation.maitre_oeuvre}
              </Text>
            )}
            <Text style={styles.rowText}>
              <Text style={styles.label}>Marché N°:</Text> {situation.marche_number || "—"}
            </Text>
            <Text style={styles.rowText}>
              <Text style={styles.label}>Montant Marché TTC:</Text> {(situation.marche_amount_ttc || 0).toLocaleString()} DZD
            </Text>
            <Text style={styles.rowText}>
              <Text style={styles.label}>Lot N°:</Text> {situation.lot_number || "01"} — {situation.lot_label || "Lot unique"}
            </Text>
            <Text style={styles.rowText}>
              <Text style={styles.label}>Projet / Opération:</Text> {situation.operation_name || situation.project_name || "—"}
            </Text>
          </View>

          {/* 2. المقاول / الشركة المتعاقدة (Co-Contractant / Entrepreneur) */}
          <View style={styles.box}>
            <Text style={styles.boxTitle}>2. Co-Contractant (Entrepreneur)</Text>
            <Text style={styles.rowText}>
              <Text style={styles.label}>Nom / Raison sociale:</Text> {situation.company_name || "—"}
            </Text>
            <Text style={styles.rowText}>
              <Text style={styles.label}>Adresse:</Text> {situation.company_address || "—"}
            </Text>
            <Text style={styles.rowText}>
              <Text style={styles.label}>RC N°:</Text> {situation.company_rc || "—"}{situation.company_rc_date ? ` (du ${situation.company_rc_date})` : ""}
            </Text>
            <Text style={styles.rowText}>
              <Text style={styles.label}>NIF:</Text> {situation.company_nif || "—"}{situation.company_nis ? ` | NIS: ${situation.company_nis}` : ""}
            </Text>
            <Text style={styles.rowText}>
              <Text style={styles.label}>Article d'imposition (AI):</Text> {situation.company_article || "—"}
            </Text>
            <Text style={styles.rowText}>
              <Text style={styles.label}>Compte Bancaire (RIB):</Text> {situation.company_rib || "—"}
            </Text>
            {situation.company_bank && (
              <Text style={styles.rowText}>
                <Text style={styles.label}>Banque / Agence:</Text> {situation.company_bank}
              </Text>
            )}
            {situation.company_capital && (
              <Text style={styles.rowText}>
                <Text style={styles.label}>Capital Social:</Text> {situation.company_capital}
              </Text>
            )}
          </View>
        </View>

        {/* جدول الحساب المالي بالترتيب الرسمي 1 إلى 14 */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { width: "70%", textAlign: "left" }]}>Désignation des prestations / Éléments financiers (1 à 14)</Text>
            <Text style={[styles.tableHeaderText, { width: "30%", textAlign: "right" }]}>Montants (DZD)</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: "70%", textAlign: "left" }]}>1. Travaux cumulés (Métrés)</Text>
            <Text style={[styles.tableCell, { width: "30%", textAlign: "right", fontWeight: "bold" }]}>{(situation.travaux_cumules || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: "70%", textAlign: "left" }]}>2. Avances forfaitaires</Text>
            <Text style={[styles.tableCell, { width: "30%", textAlign: "right" }]}>{(situation.avances_forfaitaires || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: "70%", textAlign: "left" }]}>3. Avances approvisionnement</Text>
            <Text style={[styles.tableCell, { width: "30%", textAlign: "right" }]}>{(situation.avances_approvisionnement || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: "70%", textAlign: "left" }]}>4. Travaux en avenant</Text>
            <Text style={[styles.tableCell, { width: "30%", textAlign: "right" }]}>{(situation.travaux_avenant || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: "70%", textAlign: "left" }]}>5. Autres montants</Text>
            <Text style={[styles.tableCell, { width: "30%", textAlign: "right" }]}>{(situation.autres_montant || 0).toLocaleString()}</Text>
          </View>
          <View style={[styles.tableRow, { backgroundColor: "#f1f5f9" }]}>
            <Text style={[styles.tableCell, { width: "70%", textAlign: "left", fontWeight: "bold" }]}>TOTAL 1 (1 + 2 + 3 + 4 + 5)</Text>
            <Text style={[styles.tableCell, { width: "30%", textAlign: "right", fontWeight: "bold" }]}>{(situation.total_1 || 0).toLocaleString()}</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: "70%", textAlign: "left" }]}>6. Travaux précédemment certifiés</Text>
            <Text style={[styles.tableCell, { width: "30%", textAlign: "right" }]}>{(situation.travaux_precedemment_certifies || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: "70%", textAlign: "left" }]}>7. Avances forfaitaires reçues / remboursées</Text>
            <Text style={[styles.tableCell, { width: "30%", textAlign: "right" }]}>{(situation.avances_forfaitaires_recues || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: "70%", textAlign: "left" }]}>8. Avances appro reçues</Text>
            <Text style={[styles.tableCell, { width: "30%", textAlign: "right" }]}>{(situation.avances_appro_recues || 0).toLocaleString()}</Text>
          </View>
          <View style={[styles.tableRow, { backgroundColor: "#f1f5f9" }]}>
            <Text style={[styles.tableCell, { width: "70%", textAlign: "left", fontWeight: "bold" }]}>TOTAL 2 (6 + 7 + 8)</Text>
            <Text style={[styles.tableCell, { width: "30%", textAlign: "right", fontWeight: "bold" }]}>{(situation.total_2 || 0).toLocaleString()}</Text>
          </View>

          <View style={[styles.tableRow, { backgroundColor: "#e2e8f0" }]}>
            <Text style={[styles.tableCell, { width: "70%", textAlign: "left", fontWeight: "bold" }]}>9. MONTANT BRUT (TOTAL 1 - TOTAL 2)</Text>
            <Text style={[styles.tableCell, { width: "30%", textAlign: "right", fontWeight: "bold" }]}>{(situation.montant_brut || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: "70%", textAlign: "left" }]}>10. MONTANT H.T.</Text>
            <Text style={[styles.tableCell, { width: "30%", textAlign: "right", fontWeight: "bold" }]}>{(situation.montant_ht || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: "70%", textAlign: "left" }]}>11. T.V.A. ({situation.tva_rate}%)</Text>
            <Text style={[styles.tableCell, { width: "30%", textAlign: "right" }]}>{(situation.tva_amount || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: "70%", textAlign: "left" }]}>12. MONTANT T.T.C.</Text>
            <Text style={[styles.tableCell, { width: "30%", textAlign: "right", fontWeight: "bold" }]}>{(situation.montant_ttc || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: "70%", textAlign: "left" }]}>13. Retenue de garantie ({situation.retenue_garantie_rate}%)</Text>
            <Text style={[styles.tableCell, { width: "30%", textAlign: "right" }]}>-{(situation.retenue_garantie_amount || 0).toLocaleString()}</Text>
          </View>
          <View style={[styles.tableRow, { backgroundColor: "#cbd5e1" }]}>
            <Text style={[styles.tableCell, { width: "70%", textAlign: "left", fontWeight: "bold", fontSize: 8.5 }]}>14. NET À PAYER</Text>
            <Text style={[styles.tableCell, { width: "30%", textAlign: "right", fontWeight: "bold", fontSize: 8.5 }]}>{(situation.net_a_payer || 0).toLocaleString()} DZD</Text>
          </View>
        </View>

        {/* المبلغ بالحروف */}
        <View style={{ borderWidth: 1, borderColor: "#000", padding: 5, marginBottom: 8 }}>
          <Text style={{ fontSize: 7, fontWeight: "bold", marginBottom: 2 }}>Arrêté la présente situation à la somme de :</Text>
          <Text style={{ fontSize: 7.5, fontWeight: "bold" }}>{situation.net_a_payer_text || "Zero DZD"}</Text>
        </View>

        {/* التوقيعات الثلاثة */}
        <View style={styles.signaturesRow}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>L'Entrepreneur (Co-contractant)</Text>
            <Text style={{ fontSize: 6, textAlign: "center", color: "#334155" }}>Signature & Cachet</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>Le Maître d'Œuvre</Text>
            <Text style={{ fontSize: 6, textAlign: "center", color: "#334155" }}>Visa & Avis</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>Le Service Contractant</Text>
            <Text style={{ fontSize: 6, textAlign: "center", color: "#334155" }}>Approbation</Text>
          </View>
        </View>
      </Page>

      {/* ──────────────────────────────────────────────────────── */}
      {/* ── الصفحة 2: Verso (Maître d'Ouvrage / Organisme payeur / Rejet) ── */}
      {/* ──────────────────────────────────────────────────────── */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerCenter}>
          <Text style={styles.republicText}>République Algérienne Démocratique et Populaire</Text>
          <Text style={styles.wilayaText}>Wilaya de {situation.wilaya || "Algérie"}</Text>
        </View>

        <View style={styles.titleBox}>
          <Text style={styles.mainTitle}>Situation de Travaux — Parties Administratives (Verso)</Text>
          <Text style={styles.subTitle}>Situation N° {situation.situation_number} — {situation.project_name}</Text>
        </View>

        {/* II PARTIE MAÎTRE DE L'OUVRAGE */}
        <View style={styles.versoSection}>
          <Text style={styles.versoTitle}>II. Partie Maître de l'Ouvrage / Service Contractant</Text>
          <View style={styles.rowText}><Text style={styles.label}>Pénalités de retard appliquées:</Text> <Text>{(situation.penalite_retard || 0).toLocaleString()} DZD</Text></View>
          <View style={styles.rowText}><Text style={styles.label}>Autres déductions ({situation.autre_deduction_label || "Néant"}):</Text> <Text>{(situation.autre_deduction || 0).toLocaleString()} DZD</Text></View>
          <View style={styles.rowText}><Text style={styles.label}>Montant Net retenu par le Maître d'Ouvrage:</Text> <Text style={{ fontWeight: "bold" }}>{(situation.montant_net_maitre_ouvrage || situation.net_a_payer || 0).toLocaleString()} DZD</Text></View>
          <View style={{ marginTop: 20, flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 6.5 }}>Date de réception: ___/___/202___</Text>
            <Text style={{ fontSize: 6.5, fontWeight: "bold" }}>Signature & Cachet du Maître d'Ouvrage</Text>
          </View>
        </View>

        {/* III PARTIE ORGANISME PAYEUR */}
        <View style={styles.versoSection}>
          <Text style={styles.versoTitle}>III. Partie Organisme Payeur (Trésorerie / Contrôle Financier)</Text>
          <View style={styles.rowText}><Text style={styles.label}>Visa du Contrôle Financier (CF):</Text> <Text>N° _________ du ____/____/202___</Text></View>
          <View style={styles.rowText}><Text style={styles.label}>Mandatement / Ordonnancement:</Text> <Text>Mandat N° _________ du ____/____/202___</Text></View>
          <View style={{ marginTop: 20, flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 6.5 }}>Date de paiement effectif: ___/___/202___</Text>
            <Text style={{ fontSize: 6.5, fontWeight: "bold" }}>Signature & Cachet du Trésorier / Organisme Payeur</Text>
          </View>
        </View>

        {/* IV PARTIE REJET */}
        <View style={styles.versoSection}>
          <Text style={styles.versoTitle}>IV. Partie Rejet / Observations (Le cas échéant)</Text>
          <Text style={{ fontSize: 7, color: "#334155", height: 30 }}>
            Motifs de rejet ou réserves formulées par les services de contrôle ou le maître d'ouvrage : 
            {situation.notes || " Aucune réserve formulée."}
          </Text>
          <View style={{ marginTop: 8, flexDirection: "row", justifyContent: "flex-end" }}>
            <Text style={{ fontSize: 6.5, fontWeight: "bold" }}>Signature</Text>
          </View>
        </View>
      </Page>

      {/* ──────────────────────────────────────────────────────── */}
      {/* ── الصفحة 3: الملحق التفصيلي للبنود (Détail des Articles) ── */}
      {/* ──────────────────────────────────────────────────────── */}
      {situation.items && situation.items.length > 0 && (
        <Page size="A4" style={styles.page} orientation="landscape">
          <View style={styles.headerCenter}>
            <Text style={styles.republicText}>République Algérienne Démocratique et Populaire</Text>
            <Text style={styles.wilayaText}>Annexe Détail des Prix et Quantités — Situation N° {situation.situation_number}</Text>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { width: "4%" }]}>#</Text>
              <Text style={[styles.tableHeaderText, { width: "8%" }]}>Art</Text>
              <Text style={[styles.tableHeaderText, { width: "30%", textAlign: "left" }]}>Désignation des ouvrages</Text>
              <Text style={[styles.tableHeaderText, { width: "6%" }]}>Unité</Text>
              <Text style={[styles.tableHeaderText, { width: "8%" }]}>Qté Ctr</Text>
              <Text style={[styles.tableHeaderText, { width: "8%" }]}>Qté Préc.</Text>
              <Text style={[styles.tableHeaderText, { width: "8%" }]}>Qté Période</Text>
              <Text style={[styles.tableHeaderText, { width: "8%" }]}>Qté Cumul</Text>
              <Text style={[styles.tableHeaderText, { width: "6%" }]}>Av.%</Text>
              <Text style={[styles.tableHeaderText, { width: "8%" }]}>P.U (DZD)</Text>
              <Text style={[styles.tableHeaderText, { width: "8%" }]}>Montant Cumul</Text>
            </View>

            {situation.items.map((item, i) => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: "4%" }]}>{i + 1}</Text>
                <Text style={[styles.tableCell, { width: "8%", fontWeight: "bold" }]}>{item.item_code}</Text>
                <Text style={[styles.tableCell, { width: "30%", textAlign: "left" }]}>{item.description}</Text>
                <Text style={[styles.tableCell, { width: "6%" }]}>{item.unit}</Text>
                <Text style={[styles.tableCell, { width: "8%" }]}>{(item.contracted_qty || 0).toLocaleString()}</Text>
                <Text style={[styles.tableCell, { width: "8%" }]}>{(item.previous_qty || 0).toLocaleString()}</Text>
                <Text style={[styles.tableCell, { width: "8%", fontWeight: "bold" }]}>{(item.period_qty || 0).toLocaleString()}</Text>
                <Text style={[styles.tableCell, { width: "8%" }]}>{(item.cumulative_qty || 0).toLocaleString()}</Text>
                <Text style={[styles.tableCell, { width: "6%" }]}>{item.progress_percent}%</Text>
                <Text style={[styles.tableCell, { width: "8%" }]}>{(item.unit_price || 0).toLocaleString()}</Text>
                <Text style={[styles.tableCell, { width: "8%", fontWeight: "bold" }]}>{(item.cumulative_amount || 0).toLocaleString()}</Text>
              </View>
            ))}
          </View>
        </Page>
      )}
    </Document>
  );
};

export function SituationOfficialPDFDownload({
  situation, isAr = false, children,
}: SituationPDFProps & { children: React.ReactNode }) {
  return (
    <PDFDownloadLink
      document={<SituationOfficialPDFDocument situation={situation} isAr={isAr} />}
      fileName={`Situation_Officielle_N${situation.situation_number}_${(situation.project_name || 'Projet').replace(/\s+/g, '_')}.pdf`}
      style={{ textDecoration: "none" }}
    >
      {children}
    </PDFDownloadLink>
  );
}

export default SituationOfficialPDFDocument;
