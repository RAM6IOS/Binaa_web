"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, KeyRound, Loader2 } from "lucide-react";
import type { CompanyMember } from "@/lib/types/team";
import { teamService } from "@/lib/services/team-service";
import { MemberRoleBadge, MemberStatusBadge } from "./MemberBadges";
import { TempPasswordReveal } from "./TempPasswordReveal";

interface MemberDetailsDialogProps {
  isAr: boolean;
  member: CompanyMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** يُستدعى بعد إعادة تعيين كلمة المرور (لتحديث القائمة إن لزم). */
  onResetDone?: () => void;
}

function formatDate(value: string | undefined, locale: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
}

function DetailRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children ?? <span className="truncate font-medium">{value ?? "—"}</span>}
    </div>
  );
}

export function MemberDetailsDialog({ isAr, member, open, onOpenChange, onResetDone }: MemberDetailsDialogProps) {
  const appLocale = isAr ? "ar" : "fr";
  const [emailCopied, setEmailCopied] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [resetErrorMessage, setResetErrorMessage] = useState<string | null>(null);

  if (!member) return null;

  const handleCopyEmail = () => {
    navigator.clipboard?.writeText(member.email).catch(() => null);
    setEmailCopied(true);
    toast.success(isAr ? "تم نسخ البريد" : "Email copié");
  };

  const handleResetPassword = async () => {
    setResetting(true);
    setResetErrorMessage(null);
    setTempPassword(null);
    try {
      const result = await teamService.resetMemberPassword(member.id);
      setTempPassword(result.tempPassword);
      onResetDone?.();
    } catch (err) {
      setResetErrorMessage((err as Error).message);
    } finally {
      setResetting(false);
    }
  };

  const close = (next: boolean) => {
    setEmailCopied(false);
    setTempPassword(null);
    setResetErrorMessage(null);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
              {(member.full_name ?? member.email).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 space-y-1">
              <DialogTitle className="text-lg truncate">{member.full_name || member.email}</DialogTitle>
              <div className="flex items-center gap-2">
                <MemberRoleBadge role={member.role} isAr={isAr} />
                <MemberStatusBadge status={member.status} isAr={isAr} />
              </div>
            </div>
          </div>
          <DialogDescription className="pt-1">
            {isAr ? "بيانات العضو ضمن الفريق" : "Détails du membre dans l’équipe"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-lg border p-4">
          <DetailRow label={isAr ? "الاسم الكامل" : "Nom complet"} value={member.full_name ?? undefined} />
          <DetailRow label={isAr ? "البريد الإلكتروني" : "Email"}>
            <div className="flex items-center gap-1.5 min-w-0">
              <span dir="ltr" className="truncate font-medium">{member.email}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={handleCopyEmail}
                aria-label={isAr ? "نسخ البريد" : "Copier l’email"}
              >
                <Copy className="h-4 w-4" />
                <span className="sr-only">{emailCopied ? (isAr ? "تم النسخ" : "Copié") : ""}</span>
              </Button>
            </div>
          </DetailRow>
          <DetailRow label={isAr ? "الدور" : "Rôle"}>
            <span className="truncate">{member.role === "owner" ? (isAr ? "المالك" : "Propriétaire") : member.role === "admin" ? (isAr ? "المدير" : "Administrateur") : (isAr ? "عضو" : "Membre")}</span>
          </DetailRow>
          <DetailRow label={isAr ? "الحالة" : "Statut"}>
            <span className="truncate">
              {member.status === "active" ? (isAr ? "نشط" : "Actif") : member.status === "invited" ? (isAr ? "مدعو" : "Invité") : (isAr ? "معطّل" : "Désactivé")}
            </span>
          </DetailRow>
          <DetailRow label={isAr ? "تاريخ الانضمام" : "Date d’ajout"} value={formatDate(member.joined_at, appLocale)} />
          <DetailRow label={isAr ? "تاريخ الإنشاء" : "Créé le"} value={formatDate(member.created_at, appLocale)} />
        </div>

        {member.user_id ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleResetPassword}
                disabled={resetting || tempPassword !== null}
              >
                {resetting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                {isAr ? "إعادة تعيين كلمة مرور مؤقتة" : "Réinitialiser le mot de passe"}
              </Button>
            </div>
            {resetErrorMessage ? (
              <p className="text-xs text-destructive">{resetErrorMessage}</p>
            ) : null}
            {tempPassword ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {isAr
                    ? "كلمة المرور الجديدة تُعرض مرة واحدة فقط — انسخها وأرسلها للعضو."
                    : "Le nouveau mot de passe s’affiche une seule fois — copiez-le et envoyez-le au membre."}
                </p>
                <TempPasswordReveal isAr={isAr} tempPassword={tempPassword} email={member.email} />
              </div>
            ) : null}
          </div>
        ) : (
          <p className="rounded-lg border bg-muted/50 p-3 text-xs text-muted-foreground">
            {isAr
              ? "لم يُنشأ لهذا العضو حساب تسجيل دخول بعد — إعادة تعيين كلمة المرور غير متاحة."
              : "Ce membre n’a pas encore de compte de connexion — la réinitialisation n’est pas disponible."}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" className="w-full" onClick={() => close(false)}>
            {isAr ? "إغلاق" : "Fermer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}