"use client";

import { useEffect, useState } from "react";
import { teamService } from "@/lib/services/team-service";
import {
  can as canCheck,
  canAny as canAnyCheck,
  type MemberRole,
  type Permission,
} from "@/lib/auth/permissions";
import type { MembershipWithCompany } from "@/lib/types/team";

/** هل العضوية محمّلة بعد؟ (لتفادي وميض أزرار قبل معرفة الدور) */
export function useCan() {
  const [membership, setMembership] = useState<MembershipWithCompany | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    teamService
      .getMyMembership()
      .then((m) => {
        if (!cancelled) setMembership(m);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const role: MemberRole | null | undefined = membership?.role;

  return {
    membership,
    role,
    isLoaded,
    can: (permission: Permission) => canCheck(role, permission),
    canAny: (permissions: Permission[]) => canAnyCheck(role, permissions),
  };
}