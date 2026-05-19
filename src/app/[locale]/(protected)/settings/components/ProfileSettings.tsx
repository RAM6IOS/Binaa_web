"use client";

import { useState, useEffect, useRef } from "react";
import { UserProfile } from "@/lib/types/settings";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Camera, Loader2, Eye, EyeOff } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "@/i18n/routing";

export function ProfileSettings({ locale }: { locale: string }) {
  const isAr = locale === 'ar';
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentEmail, setCurrentEmail] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState("");
  const [isEmailChanging, setIsEmailChanging] = useState(false);
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (rateLimitCooldown > 0) {
      timer = setInterval(() => {
        setRateLimitCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [rateLimitCooldown]);

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.error("User error:", userError);
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Profile fetch error:", error);
          // If profile doesn't exist, we might want to create it or handle it
          // For now, let's just show an error toast
          toast.error(isAr ? "فشل في تحميل الملف الشخصي" : "Échec du chargement du profil");
        } else if (data) {
          const userEmail = user?.email || "";
          setProfile({
            ...data,
            email: userEmail,
            language: locale as 'ar' | 'fr',
            theme: (theme as 'light' | 'dark' | 'system') || 'system'
          } as UserProfile);
          setCurrentEmail(userEmail);
          setPendingEmail(user.new_email || "");
        } else {
          // No profile data found, initialize with basic info from auth
          const userEmail = user?.email || "";
          setProfile({
            id: user.id,
            email: userEmail,
            full_name: user?.user_metadata?.full_name || "",
            language: locale as 'ar' | 'fr',
            theme: (theme as 'light' | 'dark' | 'system') || 'system'
          } as UserProfile);
          setCurrentEmail(userEmail);
          setPendingEmail(user.new_email || "");
        }
      } catch (err) {
        console.error("Load profile error:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, [supabase, isAr]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ── Validate format ──────────────────────────────────────────────────────
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(
        isAr
          ? 'يُسمح فقط بصيغ JPG و PNG و WebP'
          : 'Formats autorisés : JPG, PNG, WebP'
      );
      return;
    }

    // ── Validate size (5 MB) ─────────────────────────────────────────────────
    const MAX_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      toast.error(
        isAr
          ? 'حجم الصورة يجب أن يكون أقل من 5 ميجابايت'
          : "L'image doit être inférieure à 5 Mo"
      );
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading(
      isAr ? 'جاري رفع الصورة...' : 'Téléchargement en cours...'
    );

    try {
      // ── Get authenticated user ────────────────────────────────────────────
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error(userError?.message ?? 'User not authenticated');
      }

      // ── Generate unique filename: userId/timestamp.jpg ────────────────────
      const timestamp = Date.now();
      const fileName = `${user.id}/${timestamp}.jpg`;

      // ── Upload to "avatars" bucket (public) ──────────────────────────────
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: true,
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error('[avatar] storage upload error:', uploadError);
        throw new Error(uploadError.message);
      }

      // ── Get the public URL correctly ──────────────────────────────────────
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Append cache-buster so the browser always shows the new image
      const publicUrl = `${urlData.publicUrl}?v=${timestamp}`;

      // ── Safe upsert with onConflict: 'id' ────────────────────────────────
      const { error } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            avatar_url: publicUrl,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

      if (error) {
        console.error('Profile update error:', error);
        throw error;
      }

      // ── Refresh UI → update avatar preview immediately ────────────────────
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : prev);

      toast.dismiss(toastId);
      toast.success(
        isAr ? 'تم تحديث صورة الملف الشخصي ✓' : 'Photo de profil mise à jour ✓'
      );
    } catch (err: any) {
      console.error('[avatar] upload failed:', err);
      toast.dismiss(toastId);
      toast.error(
        isAr
          ? `فشل في رفع الصورة — ${err.message ?? 'خطأ غير معروف'}`
          : `Échec du téléchargement — ${err.message ?? 'Erreur inconnue'}`
      );
    } finally {
      setIsUploading(false);
      // Reset input so the user can re-pick the same file if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: profile.id,
          full_name: profile.full_name,
          phone: profile.phone,
          job_title: profile.job_title,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (error) throw error;

      toast.success(isAr ? "تم حفظ التغييرات بنجاح" : "Modifications enregistrées");
      
      // If language changed, redirect
      if (profile.language !== locale) {
        router.push('/settings', { locale: profile.language });
      }
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error(error.message || (isAr ? "حدث خطأ أثناء الحفظ" : "Erreur lors de l'enregistrement"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmailInput || newEmailInput === currentEmail) {
      setIsEmailDialogOpen(false);
      return;
    }

    setIsEmailChanging(true);
    try {
      const { error: authError } = await supabase.auth.updateUser({ email: newEmailInput });
      if (authError) {
        const errorMsg = authError.message.toLowerCase();
        if (errorMsg.includes('already registered') || errorMsg.includes('exists') || errorMsg.includes('duplicate key')) {
          throw new Error(isAr ? 'هذا البريد الإلكتروني مستخدم بالفعل. يرجى استخدام بريد آخر.' : 'Cet email est déjà utilisé. Veuillez en utiliser un autre.');
        }
        if (errorMsg.includes('rate limit') || errorMsg.includes('too many requests')) {
          setRateLimitCooldown(60);
          throw new Error(isAr ? 'لقد تجاوزت الحد المسموح لتغيير البريد الإلكتروني.\nيرجى الانتظار 5-10 دقائق ثم المحاولة مرة أخرى.' : 'Limite de demandes de changement d\'e-mail dépassée.\nVeuillez patienter 5 à 10 minutes avant de réessayer.');
        }
        throw authError;
      }
      
      toast.success(isAr ? "تم إرسال طلب تغيير البريد بنجاح. يرجى التحقق من بريدك القديم والجديد لإكمال العملية." : "Demande de changement d'e-mail envoyée avec succès. Veuillez vérifier votre ancienne et nouvelle boîte de réception.");
      setPendingEmail(newEmailInput);
      setIsEmailDialogOpen(false);
      setNewEmailInput("");
    } catch (error: any) {
      console.error("Change email error:", error);
      toast.error(error.message || (isAr ? "حدث خطأ أثناء تغيير البريد" : "Erreur lors du changement d'email"));
    } finally {
      setIsEmailChanging(false);
    }
  };

  const handleCancelEmailChange = async () => {
    try {
      // Calling updateUser with the current email resets the new_email flag in Supabase
      await supabase.auth.updateUser({ email: currentEmail });
      setPendingEmail("");
      toast.success(isAr ? "تم إلغاء تغيير البريد الإلكتروني" : "Changement d'email annulé");
    } catch (err) {
      console.error(err);
      toast.error(isAr ? "حدث خطأ أثناء الإلغاء" : "Erreur lors de l'annulation");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(isAr ? 'كلمة المرور الجديدة غير متطابقة' : 'Les nouveaux mots de passe ne correspondent pas');
      return;
    }
    if (newPassword.length < 6) {
      toast.error(isAr ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      toast.success(isAr ? 'تم تغيير كلمة المرور بنجاح' : 'Mot de passe modifié avec succès');
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Change password error:", error);
      toast.error(error.message || (isAr ? 'حدث خطأ أثناء تغيير كلمة المرور' : 'Erreur lors du changement de mot de passe'));
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">
          {isAr ? "لم يتم العثور على الملف الشخصي" : "Profil introuvable"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <Card className="border-none shadow-none bg-transparent">
        <form onSubmit={handleSave}>
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-2xl font-bold">
              {isAr ? 'الإعدادات الشخصية' : 'Paramètres du Profil'}
            </CardTitle>
            <CardDescription>
              {isAr ? 'إدارة معلوماتك الشخصية وإعدادات الحساب' : 'Gérez vos informations personnelles et les paramètres de votre compte'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 px-0">
            {/* Profile Picture */}
            <div className="flex flex-col items-center sm:flex-row sm:items-end gap-6">
              <div className="relative group">
                <Avatar className="w-24 h-24 border-4 border-white dark:border-slate-800 shadow-md">
                <AvatarImage src={profile.avatar_url ?? profile.profile_picture_url} />
                  <AvatarFallback className="text-2xl font-bold bg-blue-100 text-blue-700">
                    {profile.full_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageUpload} 
                />
              </div>
              <div className="space-y-1 text-center sm:text-start">
                <h3 className="font-semibold">{isAr ? 'صورة الملف الشخصي' : 'Photo de profil'}</h3>
                <p className="text-sm text-slate-500">
                  {isAr ? 'JPG أو PNG. الحد الأقصى 2 ميجا بايت' : 'JPG ou PNG. Max 2 Mo'}
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="full_name">{isAr ? 'الاسم الكامل' : 'Nom complet'}</Label>
                <Input 
                  id="full_name" 
                  value={profile.full_name || ""} 
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  placeholder="Ahmed Mansouri"
                  className="bg-white dark:bg-slate-900"
                />
              </div>
              <div className="space-y-2">
                <Label>{isAr ? 'البريد الإلكتروني' : 'Email'}</Label>
                <div className="flex gap-2">
                  <Input 
                    disabled
                    value={currentEmail} 
                    className="bg-slate-50 dark:bg-slate-900/50 flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      setNewEmailInput("");
                      setIsEmailDialogOpen(true);
                    }}
                  >
                    {isAr ? 'تغيير' : 'Changer'}
                  </Button>
                </div>
                {pendingEmail && (
                  <div className="mt-6 space-y-3">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {isAr ? 'تغييرات معلقة' : 'Changements en attente'}
                    </h4>
                    <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-900/30">
                      <div>
                        <p className="text-sm text-amber-800 dark:text-amber-300 font-medium flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {isAr ? 'تغيير البريد الإلكتروني قيد الانتظار' : 'Changement d\'e-mail en attente'}
                        </p>
                        <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1.5">
                          {isAr ? 'البريد الجديد: ' : 'Nouvel e-mail : '}
                          <span className="font-semibold" dir="ltr">{pendingEmail}</span>
                        </p>
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={handleCancelEmailChange}
                        className="bg-white hover:bg-amber-100 text-amber-700 border-amber-200 dark:bg-transparent dark:hover:bg-amber-900/40 dark:border-amber-900/50 dark:text-amber-400"
                      >
                        {isAr ? 'إلغاء الطلب' : 'Annuler la demande'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{isAr ? 'رقم الهاتف' : 'Numéro de téléphone'}</Label>
                <Input 
                  id="phone" 
                  value={profile.phone || ""} 
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="0550123456"
                  className="bg-white dark:bg-slate-900"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job_title">{isAr ? 'المسمى الوظيفي' : 'Poste / Rôle'}</Label>
                <Input 
                  id="job_title" 
                  value={profile.job_title || ""} 
                  onChange={(e) => setProfile({ ...profile, job_title: e.target.value })}
                  placeholder="Directeur de Projets"
                  className="bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>{isAr ? 'اللغة' : 'Langue'}</Label>
                <Select 
                  value={profile.language} 
                  onValueChange={(val: 'ar' | 'fr') => setProfile({ ...profile, language: val })}
                >
                  <SelectTrigger className="bg-white dark:bg-slate-900">
                    <SelectValue placeholder={isAr ? 'اختر اللغة' : 'Choisir une langue'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">العربية (Arabic)</SelectItem>
                    <SelectItem value="fr">Français (French)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isAr ? 'المظهر' : 'Thème'}</Label>
                <Select 
                  value={profile.theme} 
                  onValueChange={(val: 'light' | 'dark' | 'system') => {
                    setProfile({ ...profile, theme: val });
                    setTheme(val);
                  }}
                >
                  <SelectTrigger className="bg-white dark:bg-slate-900">
                    <SelectValue placeholder={isAr ? 'اختر المظهر' : 'Choisir un thème'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">{isAr ? 'فاتح' : 'Clair'}</SelectItem>
                    <SelectItem value="dark">{isAr ? 'داكن' : 'Sombre'}</SelectItem>
                    <SelectItem value="system">{isAr ? 'النظام' : 'Système'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <CardFooter className="px-0 pt-6 border-t border-slate-100 dark:border-slate-800">
            <Button 
              type="submit" 
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2 rtl:ml-2 rtl:mr-0" />
                  {isAr ? 'جاري الحفظ...' : 'Enregistrement...'}
                </>
              ) : (
                isAr ? 'حفظ التغييرات' : 'Enregistrer'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="border-none shadow-none bg-transparent">
        <form onSubmit={handleChangePassword}>
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
              {isAr ? 'الأمان' : 'Sécurité'}
            </CardTitle>
            <CardDescription>
              {isAr ? 'تغيير كلمة المرور الخاصة بحسابك' : 'Modifiez le mot de passe de votre compte'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-0">
            <div className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="current_password">{isAr ? 'كلمة المرور الحالية' : 'Mot de passe actuel'}</Label>
                <div className="relative">
                  <Input 
                    id="current_password" 
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword} 
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="bg-white dark:bg-slate-900 pr-10 rtl:pr-3 rtl:pl-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rtl:right-auto rtl:left-3 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_password">{isAr ? 'كلمة المرور الجديدة' : 'Nouveau mot de passe'}</Label>
                <div className="relative">
                  <Input 
                    id="new_password" 
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-white dark:bg-slate-900 pr-10 rtl:pr-3 rtl:pl-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rtl:right-auto rtl:left-3 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password">{isAr ? 'تأكيد كلمة المرور الجديدة' : 'Confirmez le nouveau mot de passe'}</Label>
                <div className="relative">
                  <Input 
                    id="confirm_password" 
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-white dark:bg-slate-900 pr-10 rtl:pr-3 rtl:pl-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rtl:right-auto rtl:left-3 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="px-0 pt-6 border-t border-slate-100 dark:border-slate-800">
            <Button 
              type="submit" 
              disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
              variant="destructive"
              className="min-w-[120px]"
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2 rtl:ml-2 rtl:mr-0" />
                  {isAr ? 'جاري التغيير...' : 'Changement...'}
                </>
              ) : (
                isAr ? 'تغيير كلمة المرور' : 'Changer le mot de passe'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Email Change Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleChangeEmail}>
            <DialogHeader>
              <DialogTitle>{isAr ? 'تغيير البريد الإلكتروني' : 'Changer l\'email'}</DialogTitle>
              <DialogDescription className="text-start">
                {isAr ? 'سيتم إرسال رسائل تأكيد.' : 'Des e-mails de confirmation seront envoyés.'}
              </DialogDescription>
              {isAr ? (
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-100 dark:border-slate-800 text-start mt-4">
                  <p className="text-slate-800 dark:text-slate-200 font-medium mb-3">سيتم إرسال:</p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
                    <li>رسالة إشعار إلى بريدك القديم (<span dir="ltr" className="text-slate-800 dark:text-slate-300 font-medium">{currentEmail}</span>)</li>
                    <li>رسالة تأكيد إلى البريد الجديد الذي أدخلته</li>
                  </ul>
                  <p className="font-semibold text-blue-600 dark:text-blue-400 mt-4 text-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 inline-block"></span>
                    يرجى التحقق من كلا البريدين لإكمال العملية.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-100 dark:border-slate-800 text-start mt-4">
                  <p className="text-slate-800 dark:text-slate-200 font-medium mb-3">Il sera envoyé :</p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
                    <li>Un e-mail de notification à votre ancienne adresse (<span dir="ltr" className="text-slate-800 dark:text-slate-300 font-medium">{currentEmail}</span>)</li>
                    <li>Un e-mail de confirmation à la nouvelle adresse saisie</li>
                  </ul>
                  <p className="font-semibold text-blue-600 dark:text-blue-400 mt-4 text-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 inline-block"></span>
                    Veuillez vérifier vos deux boîtes de réception pour terminer.
                  </p>
                </div>
              )}
            </DialogHeader>
            <div className="flex items-center space-x-2 py-4">
              <div className="grid flex-1 gap-2">
                <Label htmlFor="new_email" className="sr-only">
                  {isAr ? 'البريد الجديد' : 'Nouvel email'}
                </Label>
                <Input
                  id="new_email"
                  type="email"
                  required
                  placeholder={isAr ? 'أدخل البريد الجديد' : 'Entrez le nouvel email'}
                  value={newEmailInput}
                  onChange={(e) => setNewEmailInput(e.target.value)}
                  dir="ltr"
                  className="text-left"
                />
              </div>
            </div>
            <DialogFooter className="sm:justify-start flex-row-reverse sm:flex-row gap-2">
              <Button type="button" variant="secondary" onClick={() => setIsEmailDialogOpen(false)}>
                {isAr ? 'إلغاء' : 'Annuler'}
              </Button>
              <Button type="submit" disabled={isEmailChanging || !newEmailInput || newEmailInput === currentEmail || rateLimitCooldown > 0}>
                {isEmailChanging ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : rateLimitCooldown > 0 ? (
                  isAr ? `إعادة المحاولة بعد ${rateLimitCooldown}ث` : `Réessayer dans ${rateLimitCooldown}s`
                ) : (
                  isAr ? 'تغيير البريد' : 'Changer l\'e-mail'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
