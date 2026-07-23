"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, UploadCloud, MapPin, Image as ImageIcon, FileText } from "lucide-react";
import { toast } from "sonner";
import { documentService } from "@/lib/services/document-service";
import { createClient } from "@/lib/supabase/client";
import { ProjectDocument } from "@/lib/types/documents";

interface Props {
  isAr: boolean;
  projectId: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function UploadDocumentModal({ isAr, projectId, trigger, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    file_name: "",
    file_type: "document",
    document_type: "",
    document_date: "",
    document_category: "",
    notes: "",
    gps_coordinates: "",
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Auto-detect type
      let type = "document";
      if (file.type.startsWith("image/")) type = "image";
      else if (file.type === "application/pdf") type = "pdf";
      
      // Auto-fill name and type
      setFormData(prev => ({
        ...prev,
        file_name: prev.file_name || file.name,
        file_type: type
      }));

      // Create preview for images
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const captureGPS = () => {
    if ("geolocation" in navigator) {
      toast.info(isAr ? 'جاري تحديد الموقع...' : 'Acquisition de la position...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
             ...prev, 
             gps_coordinates: `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}` 
          }));
          toast.success(isAr ? 'تم تحديد الموقع بنجاح' : 'Position acquise');
        },
        (error) => {
          toast.error(isAr ? 'تعذر تحديد الموقع. يرجى تفعيل الـ GPS.' : 'Impossible d\'obtenir la position.');
        }
      );
    } else {
      toast.error(isAr ? 'ميزة تحديد الموقع غير مدعومة في متصفحك' : 'La géolocalisation n\'est pas supportée.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const input = fileInputRef.current;
      if (input) {
        // We can't directly assign to input.files due to security, but we can set state
        const dt = new DataTransfer();
        dt.items.add(e.dataTransfer.files[0]);
        input.files = dt.files;
        
        // Trigger synthetic change event to reuse logic
        const event = new Event('change', { bubbles: true });
        input.dispatchEvent(event);
        handleFileChange({ target: input } as any);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error(isAr ? 'يرجى اختيار ملف أولاً' : 'Veuillez d\'abord choisir un fichier');
      return;
    }
    
    setIsUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload and insert database entry using documentService
      await documentService.uploadDocument(
        projectId,
        selectedFile,
        formData.file_name,
        formData.notes || undefined,
        formData.file_type || undefined,
        formData.gps_coordinates || undefined,
        supabase,
        formData.document_type || undefined,
        formData.document_date || undefined,
        formData.document_category || undefined
      );

      toast.success(isAr ? 'تم رفع الوثيقة بنجاح' : 'Document téléchargé avec succès');
      
      // Reset form
      setOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setFormData({
        file_name: "", file_type: "document", document_type: "", document_date: "", document_category: "", notes: "", gps_coordinates: ""
      });
      if(fileInputRef.current) fileInputRef.current.value = "";
      if (onSuccess) onSuccess();
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(isAr ? 'حدث خطأ أثناء الرفع' : 'Erreur lors du téléchargement');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? trigger : (
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            {isAr ? 'رفع وثيقة / صورة ميدانية' : 'Uploader document / photo'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className={`sm:max-w-[600px] max-h-[90vh] overflow-y-auto ${isAr ? 'rtl' : 'ltr'}`}>
        <DialogHeader>
          <DialogTitle>{isAr ? 'رفع وثيقة جديدة' : 'Uploader un nouveau document'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          
          {/* File Upload Zone */}
          <div 
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors
              ${selectedFile ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900'}
            `}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileChange}
            />
            {previewUrl ? (
              <div className="flex flex-col items-center gap-3">
                <img src={previewUrl} alt="Preview" className="max-h-40 rounded-md shadow-sm object-contain" />
                <p className="text-sm font-medium text-blue-600">{selectedFile?.name}</p>
              </div>
            ) : selectedFile ? (
              <div className="flex flex-col items-center gap-3">
                <FileText className="w-12 h-12 text-blue-500" />
                <p className="text-sm font-medium text-blue-600">{selectedFile.name}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 cursor-pointer">
                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
                  <UploadCloud className="w-8 h-8 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">{isAr ? 'اضغط لاختيار ملف أو قم بسحبه هنا' : 'Cliquez ou glissez un fichier ici'}</p>
                  <p className="text-xs text-slate-500 mt-1">JPG, PNG, PDF, DOCX (Max 10MB)</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="file_name">{isAr ? 'اسم الملف' : 'Nom du fichier'}</Label>
              <Input 
                id="file_name" 
                required 
                value={formData.file_name}
                onChange={e => setFormData({ ...formData, file_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file_type">{isAr ? 'نوع الملف' : 'Type de fichier'}</Label>
              <Select value={formData.file_type} onValueChange={(v) => setFormData({ ...formData, file_type: v })}>
                <SelectTrigger id="file_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">{isAr ? "صورة ميدانية" : "Photo de terrain"}</SelectItem>
                  <SelectItem value="pdf">{isAr ? "ملف PDF" : "Fichier PDF"}</SelectItem>
                  <SelectItem value="document">{isAr ? "مستند نصي" : "Document texte"}</SelectItem>
                  <SelectItem value="report">{isAr ? "تقرير رسمي" : "Rapport officiel"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="document_type">{isAr ? 'نوع الوثيقة' : 'Type de document'}</Label>
              <Select value={formData.document_type} onValueChange={(v) => setFormData({ ...formData, document_type: v })}>
                <SelectTrigger id="document_type">
                  <SelectValue placeholder={isAr ? '-- اختر نوع الوثيقة --' : '-- Sélectionner --'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical_report">{isAr ? "تقرير فني" : "Rapport technique"}</SelectItem>
                  <SelectItem value="field_photos">{isAr ? "صور ميدانية" : "Photos de terrain"}</SelectItem>
                  <SelectItem value="administrative">{isAr ? "وثيقة إدارية" : "Document administratif"}</SelectItem>
                  <SelectItem value="contract">{isAr ? "عقد" : "Contrat"}</SelectItem>
                  <SelectItem value="invoice">{isAr ? "فاتورة" : "Facture"}</SelectItem>
                  <SelectItem value="other">{isAr ? "أخرى" : "Autre"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="document_date">{isAr ? 'التاريخ' : 'Date'}</Label>
                <Input 
                  id="document_date" 
                  type="date"
                  value={formData.document_date}
                  onChange={e => setFormData({ ...formData, document_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="document_category">{isAr ? 'فئة الوثيقة' : 'Catégorie du document'}</Label>
                <Input 
                  id="document_category" 
                  placeholder={isAr ? 'مثال: أشغال عمومية، صيانة...' : 'Ex: travaux publics, maintenance...'}
                  value={formData.document_category}
                  onChange={e => setFormData({ ...formData, document_category: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{isAr ? 'ملاحظات ميدانية' : 'Notes de terrain'}</Label>
              <Textarea 
                id="notes" 
                placeholder={isAr ? 'وصف إضافي أو ملاحظات...' : 'Description supplémentaire...'}
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gps_coordinates">{isAr ? 'إحداثيات الموقع (GPS)' : 'Coordonnées GPS'}</Label>
              <div className="flex gap-2">
                <Input 
                  id="gps_coordinates" 
                  placeholder="36.7525, 3.0419"
                  className="font-mono text-sm"
                  value={formData.gps_coordinates}
                  onChange={e => setFormData({ ...formData, gps_coordinates: e.target.value })}
                />
                <Button type="button" variant="outline" size="icon" onClick={captureGPS} title={isAr ? "التقاط الموقع الحالي" : "Capturer la position"}>
                  <MapPin className="w-4 h-4 text-slate-500" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {isAr ? 'إلغاء' : 'Annuler'}
            </Button>
            <Button type="submit" disabled={isUploading || !selectedFile} className="bg-blue-600 hover:bg-blue-700">
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isAr ? 'رفع وحفظ' : 'Uploader et sauvegarder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
