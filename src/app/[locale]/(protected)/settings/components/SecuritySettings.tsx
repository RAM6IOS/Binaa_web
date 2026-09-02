"use client";

import { useState, useEffect } from "react";
import { ActiveSession } from "@/lib/types/settings";
import { mockSupabase } from "@/lib/supabase/mock-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ShieldAlert, Monitor, Smartphone, Trash2, LogOut, Key } from "lucide-react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function SecuritySettings({ locale }: { locale: string }) {
  const isAr = locale === 'ar';
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChangingPass, setIsChangingPass] = useState(false);

  useEffect(() => {
    async function loadSessions() {
      const data = await mockSupabase.settings.getSessions("u-1");
      setSessions(data);
      setIsLoading(false);
    }
    loadSessions();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingPass(true);
    await new Promise(r => setTimeout(r, 1000));
    toast.success(isAr ? "تم تغيير كلمة المرور بنجاح" : "Mot de passe changé avec succès");
    setIsChangingPass(false);
  };

  const handleDeleteAccount = () => {
    toast.error(isAr ? "هذه الميزة غير متوفرة في النسخة التجريبية" : "Cette fonctionnalité n'est pas disponible en démo");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-destructive" />
      </div>
    );
  }

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-2xl font-bold">
          {isAr ? 'الأمان والحساب' : 'Sécurité & Compte'}
        </CardTitle>
        <CardDescription>
          {isAr ? 'إدارة كلمة المرور وحماية حسابك' : 'Gérez votre mot de passe et protégez votre compte'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 px-0">
        {/* Change Password */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Key className="w-5 h-5 text-muted-foreground" />
            {isAr ? 'تغيير كلمة المرور' : 'Changer le mot de passe'}
          </h3>
          <form onSubmit={handleChangePassword} className="grid md:grid-cols-3 gap-4 bg-card p-6 rounded-lg border">
            <div className="space-y-2">
              <Label>{isAr ? 'كلمة المرور الحالية' : 'Mot de passe actuel'}</Label>
              <Input type="password" placeholder="••••••••" className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? 'كلمة المرور الجديدة' : 'Nouveau mot de passe'}</Label>
              <Input type="password" placeholder="••••••••" className="bg-background" />
            </div>
            <div className="space-y-2 flex flex-col justify-end">
              <Button type="submit" disabled={isChangingPass} className="w-full">
                {isChangingPass ? <Loader2 className="w-4 h-4 animate-spin" /> : (isAr ? 'تحديث' : 'Mettre à jour')}
              </Button>
            </div>
          </form>
        </section>

        {/* Two-Factor */}
        <section className="space-y-4">
          <div className="flex items-center justify-between p-6 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 text-primary rounded-full">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-semibold">{isAr ? 'المصادقة الثنائية (2FA)' : 'Authentification à deux facteurs'}</h4>
                <p className="text-sm text-muted-foreground">
                  {isAr ? 'تم تفعيلها عبر البريد الإلكتروني' : 'Activée via email'}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              {isAr ? 'إدارة' : 'Gérer'}
            </Button>
          </div>
        </section>

        {/* Active Sessions */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold">{isAr ? 'الجلسات النشطة' : 'Sessions actives'}</h3>
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-4 bg-card rounded-lg border">
                <div className="flex items-center gap-4">
                  {session.device.includes('Mac') || session.device.includes('Chrome') ? (
                    <Monitor className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <Smartphone className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{session.device}</span>
                      {session.is_current && (
                        <span className="px-2 py-0.5 bg-success/10 text-success text-xs rounded-full uppercase font-bold tracking-wider">
                          {isAr ? 'الحالية' : 'Actuelle'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{session.location} • {isAr ? 'نشط مؤخراً' : 'Dernière activité'}: {new Date(session.last_active).toLocaleDateString(isAr ? 'ar-DZ' : 'fr-FR')}</p>
                  </div>
                </div>
                {!session.is_current && (
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" aria-label={isAr ? "تسجيل الخروج" : "Déconnexion"}>
                    <LogOut className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Logout Section */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold">{isAr ? 'تسجيل الخروج' : 'Déconnexion'}</h3>
          <div className="p-6 bg-muted rounded-lg border flex items-center justify-between">
            <div>
              <p className="font-medium">{isAr ? 'إنهاء الجلسة الحالية' : 'Terminer la session actuelle'}</p>
              <p className="text-sm text-muted-foreground">{isAr ? 'سيتم تسجيل خروجك من هذا المتصفح' : 'Vous serez déconnecté de ce navigateur'}</p>
            </div>
            <LogoutButton variant="destructive" />
          </div>
        </section>

        {/* Danger Zone */}
        <section className="pt-6 border-t border-destructive/20">
          <div className="p-6 bg-destructive/5 rounded-lg border border-destructive/20">
            <h4 className="font-bold text-destructive mb-2">{isAr ? 'منطقة الخطر' : 'Zone de danger'}</h4>
            <p className="text-sm text-destructive mb-4">
              {isAr ? 'بمجرد حذف حسابك، لن تتمكن من استعادته مرة أخرى. يرجى توخي الحذر.' : 'Une fois votre compte supprimé, vous ne pourrez plus revenir en arrière. Soyez prudent.'}
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2 rtl:ml-2" />
                  {isAr ? 'حذف الحساب نهائياً' : 'Supprimer mon compte'}
                </Button>
              </DialogTrigger>
              <DialogContent className={isAr ? "rtl" : "ltr"}>
                <DialogHeader>
                  <DialogTitle>{isAr ? 'هل أنت متأكد تماماً؟' : 'Êtes-vous absolument sûr ?'}</DialogTitle>
                  <DialogDescription>
                    {isAr ? 'سيتم حذف جميع بياناتك ومشاريعك المرتبطة بهذا الحساب بشكل نهائي.' : 'Cette action est irréversible. Cela supprimera définitivement vos données.'}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                  <Button variant="outline">{isAr ? 'إلغاء' : 'Annuler'}</Button>
                  <Button variant="destructive" onClick={handleDeleteAccount}>{isAr ? 'تأكيد الحذف' : 'Confirmer la suppression'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
