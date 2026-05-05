"use client";

import { useState, useEffect } from "react";
import { NotificationSettings as NotificationSettingsType } from "@/lib/types/settings";
import { mockSupabase } from "@/lib/supabase/mock-client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Mail, MessageSquare, Bell } from "lucide-react";

export function NotificationSettings({ locale }: { locale: string }) {
  const isAr = locale === 'ar';
  const [settings, setSettings] = useState<NotificationSettingsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      const data = await mockSupabase.settings.getNotifications("u-1");
      setSettings(data);
      setIsLoading(false);
    }
    loadSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      await mockSupabase.settings.updateNotifications(settings.user_id, settings);
      toast.success(isAr ? "تم تحديث تفضيلات الإشعارات" : "Préférences de notifications mises à jour");
    } catch (error) {
      toast.error(isAr ? "حدث خطأ أثناء الحفظ" : "Erreur lors de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!settings) return null;

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-2xl font-bold">
          {isAr ? 'إعدادات الإشعارات' : 'Paramètres des Notifications'}
        </CardTitle>
        <CardDescription>
          {isAr ? 'اختر كيف ومتى تريد تلقي التنبيهات' : 'Choisissez comment et quand vous souhaitez recevoir des alertes'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 px-0">
        {/* Channels */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">
            {isAr ? 'قنوات التواصل' : 'Canaux de communication'}
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <Label className="text-base font-medium">{isAr ? 'إشعارات البريد الإلكتروني' : 'Notifications par Email'}</Label>
                  <p className="text-sm text-slate-500">{isAr ? 'تلقي ملخصات وتقارير عبر البريد' : 'Recevoir des résumés et rapports par mail'}</p>
                </div>
              </div>
              <Switch 
                checked={settings.email_notifications} 
                onCheckedChange={(checked) => setSettings({ ...settings, email_notifications: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <Label className="text-base font-medium">{isAr ? 'إشعارات واتساب' : 'Notifications WhatsApp'}</Label>
                  <p className="text-sm text-slate-500">{isAr ? 'تنبيهات فورية للمهام العاجلة' : 'Alertes instantanées pour les tâches urgentes'}</p>
                </div>
              </div>
              <Switch 
                checked={settings.whatsapp_notifications} 
                onCheckedChange={(checked) => setSettings({ ...settings, whatsapp_notifications: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <Label className="text-base font-medium">{isAr ? 'إشعارات داخل التطبيق' : 'Notifications In-App'}</Label>
                  <p className="text-sm text-slate-500">{isAr ? 'تنبيهات عند استخدام المنصة' : 'Alertes lors de l\'utilisation de la plateforme'}</p>
                </div>
              </div>
              <Switch 
                checked={settings.in_app_notifications} 
                onCheckedChange={(checked) => setSettings({ ...settings, in_app_notifications: checked })}
              />
            </div>
          </div>
        </section>

        {/* Types */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">
            {isAr ? 'أنواع التنبيهات' : 'Types d\'alertes'}
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3 space-x-reverse">
              <Switch 
                id="new-task" 
                checked={settings.types.new_task_assigned} 
                onCheckedChange={(checked) => setSettings({ 
                  ...settings, 
                  types: { ...settings.types, new_task_assigned: checked } 
                })}
              />
              <Label htmlFor="new-task">{isAr ? 'تعيين مهمة جديدة' : 'Nouvelle tâche assignée'}</Label>
            </div>
            <div className="flex items-center space-x-3 space-x-reverse">
              <Switch 
                id="deadline" 
                checked={settings.types.project_deadline_approaching} 
                onCheckedChange={(checked) => setSettings({ 
                  ...settings, 
                  types: { ...settings.types, project_deadline_approaching: checked } 
                })}
              />
              <Label htmlFor="deadline">{isAr ? 'اقتراب موعد تسليم المشروع' : 'Échéance de projet proche'}</Label>
            </div>
            <div className="flex items-center space-x-3 space-x-reverse">
              <Switch 
                id="maintenance" 
                checked={settings.types.maintenance_due} 
                onCheckedChange={(checked) => setSettings({ 
                  ...settings, 
                  types: { ...settings.types, maintenance_due: checked } 
                })}
              />
              <Label htmlFor="maintenance">{isAr ? 'استحقاق صيانة العتاد' : 'Maintenance équipement due'}</Label>
            </div>
            <div className="flex items-center space-x-3 space-x-reverse">
              <Switch 
                id="worker-added" 
                checked={settings.types.worker_added_to_project} 
                onCheckedChange={(checked) => setSettings({ 
                  ...settings, 
                  types: { ...settings.types, worker_added_to_project: checked } 
                })}
              />
              <Label htmlFor="worker-added">{isAr ? 'إضافة عامل للمشروع' : 'Ouvrier ajouté au projet'}</Label>
            </div>
          </div>
        </section>
      </CardContent>
      <CardFooter className="px-0 pt-6 border-t border-slate-100 dark:border-slate-800">
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2 rtl:ml-2" />
              {isAr ? 'جاري الحفظ...' : 'Enregistrement...'}
            </>
          ) : (
            isAr ? 'حفظ التفضيلات' : 'Enregistrer'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
