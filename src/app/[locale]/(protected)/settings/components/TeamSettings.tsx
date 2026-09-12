"use client";

import { useCallback, useEffect, useState } from "react";
import { DataState } from "@/components/ui/data-state";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  UserPlus,
  Ban,
  UserCheck,
  UserCog,
  User as UserIcon,
  Loader2,
  Lock,
  Trash2,
} from "lucide-react";
import { teamService } from "@/lib/services/team-service";
import { can, getRoleLabel, type MemberRole } from "@/lib/auth/permissions";
import type { CompanyMember, CreateMemberResult, MembershipWithCompany } from "@/lib/types/team";
import { AddMemberDialog } from "./AddMemberDialog";
import { MemberDetailsDialog } from "./MemberDetailsDialog";
import { MemberRoleBadge, MemberStatusBadge } from "./MemberBadges";
import { DeleteConfirmationDialog } from "@/components/ui/DeleteConfirmationDialog";

export function TeamSettings({ locale }: { locale: string }) {
  const isAr = locale === "ar";
  const [membership, setMembership] = useState<MembershipWithCompany | null>(null);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "forbidden" | "error">("loading");
  const [addOpen, setAddOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<CompanyMember | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CompanyMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const m = await teamService.getMyMembership();
      if (!m || !can(m.role, "manage_team")) {
        setStatus("forbidden");
        return;
      }
      setMembership(m);
      const list = await teamService.listMembers(m.company_id);
      setMembers(list);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const reload = async () => {
    const m = await teamService.getMyMembership();
    if (m) {
      setMembership(m);
      setMembers(await teamService.listMembers(m.company_id));
    }
  };

  const handleRoleChange = async (member: CompanyMember, role: MemberRole) => {
    if (member.role === role) return;
    setBusyId(member.id);
    try {
      await teamService.updateMemberRole(member.id, role);
      toast.success(isAr ? "تم تغيير الدور" : "Rôle mis à jour");
      await reload();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleStatus = async (member: CompanyMember) => {
    setBusyId(member.id);
    const next = member.status === "active" ? "disabled" : "active";
    try {
      await teamService.setMemberStatus(member.id, next);
      toast.success(
        next === "disabled"
          ? isAr
            ? "تم تعطيل العضو — فقد الوصول فوراً"
            : "Membre désactivé — accès révoqué"
          : isAr
            ? "تم تفعيل العضو"
            : "Membre réactivé"
      );
      await reload();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleCreated = (result: CreateMemberResult) => {
    void reload().then(() => toast.success(result.message));
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await teamService.deleteMember(deleteTarget.id);
      toast.success(isAr ? "تم حذف العضو من الفريق" : "Membre retiré de l’équipe");
      setSelected((cur) => (cur?.id === deleteTarget.id ? null : cur));
      setDeleteTarget(null);
      await reload();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const initials = (name: string) => (name?.trim()?.charAt(0) ?? "?").toUpperCase();

  const renderRoleControl = (member: CompanyMember) => {
    if (member.role === "owner") {
      return <MemberRoleBadge role="owner" isAr={isAr} />;
    }
    return (
      <Select
        value={member.role}
        onValueChange={(v) => handleRoleChange(member, v as MemberRole)}
        disabled={busyId === member.id}
      >
        <SelectTrigger className="w-40 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="admin">
            <span className="flex items-center gap-1.5">
              <UserCog className="h-4 w-4" />
              {getRoleLabel("admin", locale as "ar" | "fr")}
            </span>
          </SelectItem>
          <SelectItem value="member">
            <span className="flex items-center gap-1.5">
              <UserIcon className="h-4 w-4" />
              {getRoleLabel("member", locale as "ar" | "fr")}
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
    );
  };

  const renderActions = (member: CompanyMember) => {
    if (member.role === "owner") {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          {isAr ? "لا يُعطل" : "Non désactivable"}
        </span>
      );
    }
    if (busyId === member.id) {
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    }
    return (
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {member.status === "active" ? (
          <Button variant="destructive" size="sm" onClick={() => handleToggleStatus(member)} className="gap-1.5">
            <Ban className="h-4 w-4" />
            {isAr ? "تعطيل" : "Désactiver"}
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => handleToggleStatus(member)} className="gap-1.5">
            <UserCheck className="h-4 w-4" />
            {isAr ? "إعادة تفعيل" : "Réactiver"}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-destructive"
          onClick={() => setDeleteTarget(member)}
          aria-label={isAr ? "حذف العضو" : "Supprimer le membre"}
        >
          <Trash2 className="h-4 w-4" />
          {isAr ? "حذف" : "Supprimer"}
        </Button>
      </div>
    );
  };

  const renderIdentity = (member: CompanyMember) => {
    const isMe = membership?.user_id === member.user_id;
    return (
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
          {initials(member.full_name ?? member.email)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {member.full_name || member.email}
            {isMe ? (
              <span className="mr-1 text-muted-foreground">({isAr ? "أنت" : "vous"})</span>
            ) : null}
          </p>
          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
        </div>
      </div>
    );
  };

  if (status === "loading") {
    return <DataState.Loading rows={4} />;
  }

  if (status === "error") {
    return (
      <DataState.Error
        title={isAr ? "تعذّر تحميل أعضاء الفريق" : "Impossible de charger l’équipe"}
        message={isAr ? "تحقق من اتصالك بالإنترنت ثم أعد المحاولة." : "Vérifiez votre connexion puis réessayez."}
        retryLabel={isAr ? "إعادة المحاولة" : "Réessayer"}
        onRetry={load}
      />
    );
  }

  if (status === "forbidden") {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <Lock className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {isAr ? "إدارة الفريق متاحة للمالك والمدير فقط." : "La gestion de l’équipe est réservée au propriétaire et à l’administrateur."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg md:text-xl font-semibold tracking-tight">
            {isAr ? "الفريق" : "L’équipe"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isAr
              ? `إدارة أعضاء شركة «${membership?.company?.name ?? ""}» وأدوارهم.`
              : `Gérez les membres de l’entreprise «${membership?.company?.name ?? ""}» et leurs rôles.`}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} size="lg" className="gap-2">
          <UserPlus className="h-5 w-5" />
          {isAr ? "إضافة مستخدم" : "Ajouter un utilisateur"}
        </Button>
      </div>

      {members.length === 0 ? (
        <DataState.Empty
          icon={<UserIcon className="h-12 w-12 text-muted-foreground" />}
          title={isAr ? "لا يوجد أعضاء بعد" : "Aucun membre pour l’instant"}
          description={isAr ? "ابدأ بإضافة أول مستخدم إلى شركتك." : "Commencez par ajouter un premier membre."}
          action={
            <Button onClick={() => setAddOpen(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              {isAr ? "إضافة مستخدم" : "Ajouter un utilisateur"}
            </Button>
          }
        />
      ) : (
        <>
          {/* سطح المكتب/التابلت: جدول تقليدي */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-48">{isAr ? "العضو" : "Membre"}</TableHead>
                  <TableHead>{isAr ? "الدور" : "Rôle"}</TableHead>
                  <TableHead>{isAr ? "الحالة" : "Statut"}</TableHead>
                  <TableHead className="text-right">{isAr ? "إجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow
                    key={member.id}
                    className="cursor-pointer"
                    onClick={() => setSelected(member)}
                  >
                    <TableCell>{renderIdentity(member)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>{renderRoleControl(member)}</TableCell>
                    <TableCell>
                      <MemberStatusBadge status={member.status} isAr={isAr} />
                    </TableCell>
                    <TableCell className="text-right">{renderActions(member)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* الموبايل: بطاقات عمودية */}
          <div className="space-y-4 md:hidden">
            {members.map((member) => (
              <div
                key={member.id}
                className="rounded-lg border p-4 space-y-3 cursor-pointer"
                onClick={() => setSelected(member)}
              >
                <div className="flex items-center justify-between gap-2">
                  {renderIdentity(member)}
                  <MemberStatusBadge status={member.status} isAr={isAr} />
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">{isAr ? "الدور" : "Rôle"}</span>
                  <div onClick={(e) => e.stopPropagation()}>{renderRoleControl(member)}</div>
                </div>
                <div className="flex justify-end">{renderActions(member)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <AddMemberDialog
        locale={locale}
        companyName={membership?.company?.name}
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={handleCreated}
      />

      <MemberDetailsDialog
        isAr={isAr}
        member={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />

      <DeleteConfirmationDialog
        isOpen={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={handleDeleteConfirm}
        isLoading={deleting}
        isAr={isAr}
        title={isAr ? "حذف العضو من الفريق" : "Retirer le membre"}
        description={
          isAr
            ? `سيتم إزالة «${deleteTarget?.full_name || deleteTarget?.email}» من شركتك ولن يتمكن من الدخول بعد الآن. حساب تسجيل الدخول نفسه لن يُحذف.`
            : `«${deleteTarget?.full_name || deleteTarget?.email}» sera retiré de votre entreprise et ne pourra plus se connecter. Le compte de connexion lui-même ne sera pas supprimé.`
        }
      />
    </div>
  );
}