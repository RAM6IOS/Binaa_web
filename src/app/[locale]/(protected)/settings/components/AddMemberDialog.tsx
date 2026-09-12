"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, CheckCircle2, UserPlus } from "lucide-react";
import type { MemberRole } from "@/lib/auth/permissions";
import type { CreateMemberResult, MemberCreateOutcome } from "@/lib/types/team";
import { TempPasswordReveal } from "./TempPasswordReveal";

interface AddMemberDialogProps {
  locale: string;
  companyName?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (result: CreateMemberResult) => void;
}

export function AddMemberDialog({ locale, companyName, open, onOpenChange, onCreated }: AddMemberDialogProps) {
  const isAr = locale === "ar";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<MemberRole, "owner">>("member");
  const [tempPassword, setTempPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CreateMemberResult | null>(null);

  const resultTitle = (outcome: MemberCreateOutcome): string => {
    switch (outcome) {
      case "created":
        return isAr ? "تم إنشاء الحساب" : "Compte créé";
      case "reactivated":
        return isAr ? "تم تفعيل العضو مجدداً" : "Membre réactivé";
      case "linked":
        return isAr ? "تم ربط العضو بحساب موجود" : "Membre lié à un compte existant";
    }
  };

  const reset = () => {
    setFullName("");
    setEmail("");
    setRole("member");
    setTempPassword("");
    setSubmitting(false);
    setResult(null);
  };

  const handleClose = (next: boolean) => {
    if (next && result) {
      // أُكملت الإضافة — نتائج جديدة ستفتح لاحقاً
      onCreated(result);
      reset();
      onOpenChange(false);
      return;
    }
    onOpenChange(false);
    if (!next) reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/team/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          role,
          tempPassword: tempPassword.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        toast.error(json?.error ?? (isAr ? "فشل إضافة المستخدم" : "Échec de l’ajout"));
        return;
      }
      setResult(json as CreateMemberResult);
    } catch {
      toast.error(isAr ? "تعذّر الاتصال بالخادم — أعد المحاولة" : "Impossible de joindre le serveur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                {resultTitle(result.case)}
              </DialogTitle>
              <DialogDescription>{result.message}</DialogDescription>
            </DialogHeader>

            {result.tempPassword ? (
              <TempPasswordReveal isAr={isAr} tempPassword={result.tempPassword} email={email} />
            ) : (
              <p className="text-sm text-muted-foreground">
                {isAr
                  ? "تم ربط العضو بحسابه الحالي — لا حاجة لكلمة مرور جديدة."
                  : "Le membre a été lié à son compte existant — aucun mot de passe requis."}
              </p>
            )}

            <DialogFooter>
              <Button onClick={() => handleClose(true)} className="w-full gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {isAr ? "تم — إغلاق" : "Terminé — Fermer"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                {isAr ? "إضافة مستخدم" : "Ajouter un utilisateur"}
              </DialogTitle>
              <DialogDescription>
                {companyName
                  ? isAr
                    ? `إنشاء حساب داخل شركة «${companyName}» — المدعوّ يدخل نفس الشركة مباشرة.`
                    : `Création d’un compte dans l’entreprise «${companyName}» — le membre rejoint la même entreprise.`
                  : isAr
                    ? "إنشاء حساب جديد داخل شركتك."
                    : "Création d’un nouveau compte dans votre entreprise."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="member-full_name">{isAr ? "الاسم الكامل" : "Nom complet"} *</Label>
                <Input
                  id="member-full_name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={isAr ? "مثال: أحمد بن علي" : "Ex: Ahmed Benali"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="member-email">{isAr ? "البريد الإلكتروني" : "Email"} *</Label>
                <Input
                  id="member-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                />
              </div>

              <div className="space-y-2">
                <Label>{isAr ? "الدور" : "Rôle"} *</Label>
                <Select value={role} onValueChange={(v) => setRole(v as Exclude<MemberRole, "owner">)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{isAr ? "مدير (admin)" : "Administrateur"}</SelectItem>
                    <SelectItem value="member">{isAr ? "عضو (member)" : "Membre"}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {isAr
                    ? "لا يمكن إنشاء مالك من الواجهة العادية."
                    : "Le rôle propriétaire ne peut pas être créé depuis l’interface."}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="member-temp">{isAr ? "كلمة مرور مؤقتة" : "Mot de passe temporaire"}</Label>
                <Input
                  id="member-temp"
                  type="text"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  placeholder={isAr ? "اتركه فارغاً للتوليد التلقائي" : "Laisser vide pour générer automatiquement"}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                  {isAr ? "إلغاء" : "Annuler"}
                </Button>
                <Button type="submit" disabled={submitting} className="gap-2">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  {isAr ? "إنشاء الحساب" : "Créer le compte"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}