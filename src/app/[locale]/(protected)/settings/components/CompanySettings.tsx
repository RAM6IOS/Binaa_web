"use client";

import { useState, useEffect } from "react";
import { CompanySettings as CompanySettingsType } from "@/lib/types/settings";
import { mockSupabase } from "@/lib/supabase/mock-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Building, Camera, Loader2, Globe } from "lucide-react";

export function CompanySettings({ locale }: { locale: string }) {
  const isAr = locale === 'ar';
  const [company, setCompany] = useState<CompanySettingsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadCompany() {
      const data = await mockSupabase.settings.getCompany();
      setCompany(data);
      setIsLoading(false);
    }
    loadCompany();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    setIsSaving(true);
    try {
      await mockSupabase.settings.updateCompany(company);
      toast.success(isAr ? "تم تحديث بيانات الشركة بنجاح" : "Données de l'entreprise mises à jour");
    } catch (error) {
      toast.error(isAr ? "حدث خطأ أثناء الحفظ" : "Erreur lors de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!company) return null;

  return (
    <Card className="border-none shadow-none bg-transparent">
      <form onSubmit={handleSave}>
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-2xl font-bold">
            {isAr ? 'إعدادات الشركة' : 'Paramètres de l\'Entreprise'}
          </CardTitle>
          <CardDescription>
            {isAr ? 'إدارة معلومات الشركة والهوية المؤسسية' : 'Gérez les informations de votre entreprise et son identité visuelle'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 px-0">
          {/* Company Logo */}
          <div className="flex flex-col items-center sm:flex-row sm:items-end gap-6">
            <div className="relative group">
              <Avatar className="w-24 h-24 rounded-2xl border-4 border-white dark:border-slate-800 shadow-md">
                <AvatarImage src={company.logo_url} className="object-cover" />
                <AvatarFallback className="rounded-2xl text-2xl font-bold bg-green-100 text-green-700">
                  {company.company_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <button 
                type="button"
                className="absolute bottom-0 right-0 p-2 bg-green-600 text-white rounded-lg shadow-lg hover:bg-green-700 transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1 text-center sm:text-start">
              <h3 className="font-semibold">{isAr ? 'شعار الشركة' : 'Logo de l\'entreprise'}</h3>
              <p className="text-sm text-slate-500">
                {isAr ? 'يفضل أن يكون بخلفية شفافة PNG' : 'Format PNG transparent recommandé'}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="company_name">{isAr ? 'اسم الشركة' : 'Nom de l\'entreprise'}</Label>
              <Input 
                id="company_name" 
                value={company.company_name} 
                onChange={(e) => setCompany({ ...company, company_name: e.target.value })}
                className="bg-white dark:bg-slate-900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wilaya">{isAr ? 'الولاية' : 'Wilaya'}</Label>
              <Input 
                id="wilaya" 
                value={company.wilaya} 
                onChange={(e) => setCompany({ ...company, wilaya: e.target.value })}
                className="bg-white dark:bg-slate-900"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">{isAr ? 'العنوان الكامل' : 'Adresse complète'}</Label>
              <Textarea 
                id="address" 
                value={company.address} 
                onChange={(e) => setCompany({ ...company, address: e.target.value })}
                className="bg-white dark:bg-slate-900 min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_id">{isAr ? 'الرقم الضريبي (NIF)' : 'NIF (Identifiant Fiscal)'}</Label>
              <Input 
                id="tax_id" 
                value={company.tax_id} 
                onChange={(e) => setCompany({ ...company, tax_id: e.target.value })}
                className="bg-white dark:bg-slate-900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registration_number">{isAr ? 'رقم السجل التجاري (RC)' : 'RC (Registre de Commerce)'}</Label>
              <Input 
                id="registration_number" 
                value={company.registration_number} 
                onChange={(e) => setCompany({ ...company, registration_number: e.target.value })}
                className="bg-white dark:bg-slate-900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_phone">{isAr ? 'رقم هاتف الشركة' : 'Téléphone pro'}</Label>
              <Input 
                id="company_phone" 
                value={company.phone} 
                onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                className="bg-white dark:bg-slate-900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_email">{isAr ? 'البريد الإلكتروني للشركة' : 'Email pro'}</Label>
              <Input 
                id="company_email" 
                value={company.email} 
                onChange={(e) => setCompany({ ...company, email: e.target.value })}
                className="bg-white dark:bg-slate-900"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="website" className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-400" />
                {isAr ? 'الموقع الإلكتروني (اختياري)' : 'Site web (optionnel)'}
              </Label>
              <Input 
                id="website" 
                value={company.website || ''} 
                onChange={(e) => setCompany({ ...company, website: e.target.value })}
                placeholder="https://www.example.com"
                className="bg-white dark:bg-slate-900"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="px-0 pt-6 border-t border-slate-100 dark:border-slate-800">
          <Button 
            type="submit" 
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700 text-white min-w-[120px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2 rtl:ml-2" />
                {isAr ? 'جاري الحفظ...' : 'Enregistrement...'}
              </>
            ) : (
              isAr ? 'حفظ بيانات الشركة' : 'Enregistrer les données'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
