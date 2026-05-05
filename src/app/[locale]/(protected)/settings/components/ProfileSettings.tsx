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

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
          .single();

        if (error) {
          console.error("Profile fetch error:", error);
          // If profile doesn't exist, we might want to create it or handle it
          // For now, let's just show an error toast
          toast.error(isAr ? "فشل في تحميل الملف الشخصي" : "Échec du chargement du profil");
        } else {
          const userEmail = user?.email || "";
          setProfile({
            ...data,
            email: userEmail
          } as UserProfile);
          setCurrentEmail(userEmail);
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

      // ── Generate unique filename: userId-timestamp.jpg ────────────────────
      const timestamp = Date.now();
      const fileName = `${user.id}-${timestamp}.jpg`;

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
      let emailChanged = false;
      const newEmail = profile.email;
      if (newEmail && newEmail !== currentEmail) {
        const { error: authError } = await supabase.auth.updateUser({ email: newEmail });
        if (authError) {
          if (authError.message.includes('already registered') || authError.message.includes('exists')) {
            throw new Error(isAr ? 'البريد الإلكتروني مستخدم بالفعل' : 'Cet email est déjà utilisé');
          }
          throw authError;
        }
        emailChanged = true;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          job_title: profile.job_title,
          language: profile.language,
          theme: profile.theme
        })
        .eq('id', profile.id);

      if (error) throw error;

      if (emailChanged) {
        toast.success(isAr ? "تم إرسال رابط التأكيد إلى بريدك الجديد" : "Un lien de confirmation a été envoyé à votre nouvel email");
        setCurrentEmail(profile.email || "");
      } else {
        toast.success(isAr ? "تم حفظ التغييرات بنجاح" : "Modifications enregistrées");
      }
      
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
                <Label htmlFor="email">{isAr ? 'البريد الإلكتروني' : 'Email'}</Label>
                <Input 
                  id="email" 
                  type="email"
                  value={profile.email || ""} 
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="bg-white dark:bg-slate-900"
                />
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  {isAr ? 'تغيير البريد يتطلب تأكيد جديد' : 'Changer d\'email nécessite une nouvelle confirmation'}
                </p>
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
    </div>
  );
}
