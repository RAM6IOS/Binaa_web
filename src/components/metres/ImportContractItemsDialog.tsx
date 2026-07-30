"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download, FileSpreadsheet, Globe, Sparkles, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateContractItemsTemplate, parseContractItemsExcel, ParsedContractItemRow } from "@/lib/utils/excel";
import { contractItemsService } from "@/lib/services/contract-items-service";
import { ContractItem } from "@/lib/types/metres";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

interface ImportContractItemsDialogProps {
  isAr: boolean;
  projectId: string;
  onSuccess: () => void;
  existingItems: ContractItem[];
  trigger?: React.ReactNode;
}

export function ImportContractItemsDialog({ isAr, projectId, onSuccess, existingItems, trigger }: ImportContractItemsDialogProps) {
  const [open, setOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [rows, setRows] = useState<ParsedContractItemRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [sheetUrl, setSheetUrl] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    generateContractItemsTemplate(isAr);
    toast.success(isAr ? 'تم تحميل القالب بنجاح' : 'Modèle téléchargé avec succès');
  };

  const processRawData = (rawData: any[]) => {
    const existingItemNumbers = new Set(existingItems.map(i => String(i.item_number).trim()));
    const fileItemNumbers = new Set<string>();

    return rawData.map((raw: any, index: number) => {
      const rowNumber = index + 2;
      const errors: string[] = [];

      const item_number = String(raw.item_number || raw.Item_Number || raw.Numero || raw.num || '').trim();
      const designation = String(raw.designation || raw.Designation || raw.Description || '').trim();
      const unit = String(raw.unit || raw.Unit || raw.Unite || '').trim();
      
      const qty_raw = raw.quantity ?? raw.Quantity ?? raw.Qté ?? raw.qte;
      const quantity = qty_raw !== '' && !isNaN(Number(qty_raw)) ? Number(qty_raw) : null;

      const price_raw = raw.unit_price ?? raw.Unit_Price ?? raw.Prix_Unitaire ?? raw.pu;
      const unit_price = price_raw !== '' && !isNaN(Number(price_raw)) ? Number(price_raw) : null;

      const notes = String(raw.notes || raw.Notes || '').trim();

      if (!item_number) {
        errors.push(isAr ? 'رقم البند مطلوب' : 'Numéro d\'article requis');
      } else {
        if (fileItemNumbers.has(item_number)) {
          errors.push(isAr ? 'رقم البند مكرر في البيانات' : 'Numéro en double');
        } else if (existingItemNumbers.has(item_number)) {
          errors.push(isAr ? 'رقم البند مسجل مسبقاً في المشروع' : 'Article déjà existant');
        } else {
          fileItemNumbers.add(item_number);
        }
      }

      if (!designation) errors.push(isAr ? 'وصف البند مطلوب' : 'Désignation requise');
      if (!unit) errors.push(isAr ? 'الوحدة مطلوبة' : 'Unité requise');
      if (quantity === null || quantity < 0) errors.push(isAr ? 'الكمية العقدية غير صالحة' : 'Quantité invalide');
      if (unit_price === null || unit_price < 0) errors.push(isAr ? 'السعر الوحدي غير صالح' : 'Prix unitaire invalide');

      return {
        rowNumber,
        item_number,
        designation,
        unit,
        quantity,
        unit_price,
        notes,
        errors,
        isValid: errors.length === 0,
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsParsing(true);

    try {
      const rawData = await parseContractItemsExcel(file);
      setRows(processRawData(rawData));
    } catch (error) {
      console.error(error);
      toast.error(isAr ? 'فشل قراءة ملف Excel' : 'Erreur de lecture du fichier');
    } finally {
      setIsParsing(false);
    }
  };

  const handleFetchGoogleSheet = async () => {
    if (!sheetUrl) {
      toast.error(isAr ? 'يرجى إدخال رابط Google Sheets' : 'Veuillez entrer le lien Google Sheets');
      return;
    }

    setIsParsing(true);
    try {
      const res = await fetch(`/api/contract-items/import-sheet?url=${encodeURIComponent(sheetUrl)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch');
      }

      const workbook = XLSX.read(data.csvText, { type: 'string' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      setRows(processRawData(rawData));
      toast.success(isAr ? 'تم جلب البيانات بنجاح' : 'Données récupérées avec succès');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || (isAr ? 'فشل جلب البيانات. تأكد من أن الرابط عام (Public)' : 'Erreur de récupération. Vérifiez que le lien est public'));
    } finally {
      setIsParsing(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleExtractAI = async () => {
    if (!imageFile) {
      toast.error(isAr ? 'يرجى رفع صورة أولاً' : 'Veuillez télécharger une image');
      return;
    }

    setIsParsing(true);
    try {
      const formData = new FormData();
      formData.append("image", imageFile);

      const res = await fetch("/api/contract-items/extract-image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed");

      setRows(processRawData(data.items || []));
      toast.success(isAr ? 'تم استخراج بنود العقد بالذكاء الاصطناعي بنجاح ✓' : 'Articles extraits par IA avec succès ✓');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || (isAr ? 'فشل استخراج البيانات بالذكاء الاصطناعي' : 'Erreur d\'extraction IA'));
    } finally {
      setIsParsing(false);
    }
  };

  const validCount = rows.filter(r => r.isValid).length;
  const invalidCount = rows.length - validCount;

  const handleImport = async () => {
    const validRows = rows.filter(r => r.isValid);
    if (validRows.length === 0) {
      toast.error(isAr ? 'لا توجد صفوف صحيحة للاستيراد' : 'Aucune ligne valide à importer');
      return;
    }

    setIsImporting(true);
    let importedCount = 0;
    let failedCount = 0;

    const dtos = validRows.map((row, idx) => ({
      project_id: projectId,
      item_number: row.item_number,
      designation: row.designation,
      unit: row.unit,
      quantity: row.quantity!,
      unit_price: row.unit_price!,
      notes: row.notes || undefined,
      sort_order: existingItems.length + idx + 1,
    }));

    try {
      await contractItemsService.createMany(dtos);
      importedCount = dtos.length;
    } catch (err) {
      console.error('Import batch error:', err);
      // Fallback to individual creation if batch fails
      for (const dto of dtos) {
        try {
          await contractItemsService.create(dto);
          importedCount++;
        } catch {
          failedCount++;
        }
      }
    }

    setIsImporting(false);
    toast.success(
      isAr
        ? `تم استيراد ${importedCount} بند بنجاح${failedCount > 0 ? ` (فشل ${failedCount})` : ''}`
        : `${importedCount} articles importés avec succès${failedCount > 0 ? ` (${failedCount} échecs)` : ''}`
    );

    setOpen(false);
    setRows([]);
    setFileName(null);
    setSheetUrl("");
    setImageFile(null);
    setImagePreview(null);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) { setRows([]); setFileName(null); setSheetUrl(""); setImageFile(null); setImagePreview(null); } }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2 font-bold">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            {isAr ? 'استيراد بنود العقد' : 'Importer BPU'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[850px] max-h-[90vh] flex flex-col" dir={isAr ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            {isAr ? 'استيراد بنود العقد (BPU) - Excel / Sheets / AI' : 'Importer le BPU'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 flex-1 overflow-y-auto py-2">
          <Tabs defaultValue="file" className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-xl h-11">
              <TabsTrigger value="file" className="gap-2 font-bold rounded-lg text-xs sm:text-sm">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                {isAr ? 'ملف Excel' : 'Excel'}
              </TabsTrigger>
              <TabsTrigger value="sheet" className="gap-2 font-bold rounded-lg text-xs sm:text-sm">
                <Globe className="w-4 h-4 text-blue-600" />
                {isAr ? 'Google Sheets' : 'Sheets'}
              </TabsTrigger>
              <TabsTrigger value="ai" className="gap-2 font-bold rounded-lg text-xs sm:text-sm">
                <Sparkles className="w-4 h-4 text-purple-600" />
                {isAr ? 'صورة (AI)' : 'Image (AI)'}
              </TabsTrigger>
            </TabsList>

            {/* تبويب ملف Excel */}
            <TabsContent value="file" className="space-y-4 pt-4">
              <div className="bg-slate-50 dark:bg-slate-900 border rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {isAr ? 'تحميل قالب Excel النموذجي' : 'Télécharger le modèle Excel'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isAr ? 'استخدم هذا القالب لضمان تطابق الأعمدة (رقم البند، الوصف، الوحدة، الكمية، السعر).' : 'Utilisez ce modèle pour garantir la conformité.'}
                  </p>
                </div>
                <Button variant="secondary" onClick={handleDownloadTemplate} className="gap-2 shrink-0 font-bold">
                  <Download className="w-4 h-4 text-blue-600" />
                  {isAr ? 'تحميل القالب' : 'Télécharger'}
                </Button>
              </div>

              <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center hover:bg-slate-50/50 transition-colors cursor-pointer relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                    {fileName ? fileName : (isAr ? 'انقر لرفع ملف أو اسحبه هنا' : 'Cliquez ou glissez un fichier ici')}
                  </p>
                  <p className="text-xs text-slate-400">
                    {isAr ? 'يدعم ملفات .xlsx, .xls, .csv' : 'Supporte .xlsx, .xls, .csv'}
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* تبويب Google Sheets */}
            <TabsContent value="sheet" className="space-y-4 pt-4">
              <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 rounded-2xl p-4 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-blue-900 dark:text-blue-200">
                    {isAr ? 'رابط Google Sheets (عام - Public)' : 'Lien Google Sheets (Public)'}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      className="bg-white dark:bg-slate-900"
                    />
                    <Button onClick={handleFetchGoogleSheet} disabled={isParsing} className="bg-blue-600 hover:bg-blue-700 font-bold shrink-0 gap-2">
                      {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                      {isAr ? 'جلب البيانات' : 'Importer'}
                    </Button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  {isAr ? 'تأكد من مشاركة الملف كـ "Anyone with the link can view".' : 'Assurez-vous que le fichier est public.'}
                </p>
              </div>
            </TabsContent>

            {/* تبويب الذكاء الاصطناعي (صورة جدول) */}
            <TabsContent value="ai" className="space-y-4 pt-4">
              <div className="bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900 rounded-2xl p-4 space-y-4">
                <div>
                  <h4 className="font-black text-sm text-purple-900 dark:text-purple-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    {isAr ? 'استخراج بنود العقد من صورة جدول بالذكاء الاصطناعي' : 'Extraction IA depuis une image'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {isAr ? 'ارفع صورة لجدول الكميات (BPU) وسيقوم الذكاء الاصطناعي بقراءتها واستخراج البنود والأسعار تلقائياً.' : 'Téléchargez une image de table BPU pour extraction automatique par IA.'}
                  </p>
                </div>

                <div className="border-2 border-dashed border-purple-200 dark:border-purple-800 rounded-2xl p-6 text-center hover:bg-purple-50/50 transition-colors cursor-pointer relative">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                      {imageFile ? imageFile.name : (isAr ? 'انقر لرفع صورة الجدول' : 'Cliquez pour charger une image')}
                    </p>
                    {imagePreview && (
                      <div className="mt-2 relative w-32 h-20 rounded-lg overflow-hidden border shadow-sm">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleExtractAI}
                  disabled={!imageFile || isParsing}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2 h-11 rounded-xl"
                >
                  {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {isAr ? 'استخراج بنود العقد بالذكاء الاصطناعي' : 'Extraire les données par IA'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* معاينة النتائج */}
          {isParsing && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm font-bold text-slate-600">{isAr ? 'جاري قراءة وتحليل بنود العقد بالذكاء الاصطناعي...' : 'Analyse des données par IA en cours...'}</p>
            </div>
          )}

          {rows.length > 0 && !isParsing && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500 font-bold">{isAr ? 'إجمالي الصفوف' : 'Total'}</p>
                  <p className="text-lg font-black text-slate-900 dark:text-slate-100">{rows.length}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">{isAr ? 'صحيحة جاهزة' : 'Valides'}</p>
                  <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">{validCount}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-red-600 dark:text-red-400 font-bold">{isAr ? 'تحتوي أخطاء' : 'Erreurs'}</p>
                  <p className="text-lg font-black text-red-700 dark:text-red-300">{invalidCount}</p>
                </div>
              </div>

              <div className="border rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
                    <TableRow className="text-xs font-black">
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>{isAr ? 'رقم البند' : 'N°'}</TableHead>
                      <TableHead>{isAr ? 'الوصف' : 'Désignation'}</TableHead>
                      <TableHead>{isAr ? 'الوحدة' : 'Unité'}</TableHead>
                      <TableHead>{isAr ? 'الكمية' : 'Qté'}</TableHead>
                      <TableHead>{isAr ? 'السعر' : 'Prix'}</TableHead>
                      <TableHead>{isAr ? 'الحالة' : 'Statut'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {rows.map((row) => (
                      <TableRow
                        key={row.rowNumber}
                        className={row.isValid ? 'bg-emerald-50/20' : 'bg-red-50/30'}
                      >
                        <TableCell className="font-mono font-bold">{row.rowNumber}</TableCell>
                        <TableCell className="font-mono font-bold">{row.item_number || '-'}</TableCell>
                        <TableCell className="font-medium truncate max-w-[150px]">{row.designation || '-'}</TableCell>
                        <TableCell>{row.unit || '-'}</TableCell>
                        <TableCell className="font-mono">{row.quantity !== null ? row.quantity.toLocaleString() : '-'}</TableCell>
                        <TableCell className="font-mono">{row.unit_price !== null ? `${row.unit_price} DZD` : '-'}</TableCell>
                        <TableCell>
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> {isAr ? 'صحيح' : 'Valide'}
                            </span>
                          ) : (
                            <div className="text-red-600 font-bold space-y-0.5">
                              <span className="inline-flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5" /> {isAr ? 'خطأ' : 'Erreur'}
                              </span>
                              <p className="text-[10px] text-red-500 font-normal">{row.errors.join(', ')}</p>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {isAr ? 'إلغاء' : 'Annuler'}
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || validCount === 0}
            className="bg-emerald-600 hover:bg-emerald-700 gap-2 font-bold px-6"
          >
            {isImporting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isAr ? `استيراد (${validCount} بند)` : `Importer (${validCount})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
