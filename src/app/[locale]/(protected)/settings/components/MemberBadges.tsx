"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Ban, Clock, ShieldCheck, UserCog, User as UserIcon } from "lucide-react";
import { getRoleLabel, type MemberRole } from "@/lib/auth/permissions";
import type { MemberStatus } from "@/lib/types/team";

/** شارة حالة العضو: لون + أيقونة + نص (سياق الميدان: وضوح تحت الشمس والقفازات). */
export function MemberStatusBadge({ status, isAr }: { status: MemberStatus; isAr: boolean }) {
  if (status === "active") {
    return (
      <Badge variant="success" className="gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {isAr ? "نشط" : "Actif"}
      </Badge>
    );
  }
  if (status === "invited") {
    return (
      <Badge variant="warning" className="gap-1.5">
        <Clock className="h-3.5 w-3.5" />
        {isAr ? "مدعو" : "Invité"}
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="gap-1.5">
      <Ban className="h-3.5 w-3.5" />
      {isAr ? "معطّل" : "Désactivé"}
    </Badge>
  );
}

/** شارة الدور — المالك بشارة بارزة، والباقي توضيحي. */
export function MemberRoleBadge({ role, isAr }: { role: MemberRole; isAr: boolean }) {
  if (role === "owner") {
    return (
      <Badge variant="info" className="gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5" />
        {isAr ? "المالك" : "Propriétaire"}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1.5">
      {role === "admin" ? <UserCog className="h-3.5 w-3.5" /> : <UserIcon className="h-3.5 w-3.5" />}
      {getRoleLabel(role, isAr ? "ar" : "fr")}
    </Badge>
  );
}