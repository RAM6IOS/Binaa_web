"use client";

import { use, useState, useEffect, useCallback } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { DataState } from "@/components/ui/data-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, ShieldCheck, Lock, ArrowLeft } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { teamService } from "@/lib/services/team-service";
import {
  ROLES,
  can,
  getRoleLabel,
  getRoleDescription,
  getPermissionLabel,
  getPermissionsMatrix,
  type AppLocale,
} from "@/lib/auth/permissions";

export default function RolesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const isAr = locale === "ar";
  const dir: "rtl" | "ltr" = locale === "ar" ? "rtl" : "ltr";
  const appLocale = locale as AppLocale;
  const router = useRouter();

  // loading: جلب العضوية | allowed: owner/admin | forbidden: غيره | error: فشل الشبكة
  const [status, setStatus] = useState<"loading" | "allowed" | "forbidden" | "error">("loading");
  const [companyName, setCompanyName] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const membership = await teamService.getMyMembership();
      if (!membership || !can(membership.role, "manage_team")) {
        setStatus("forbidden");
        return;
      }
      setCompanyName(membership.company?.name ?? null);
      setStatus("allowed");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const matrix = getPermissionsMatrix();

  if (status === "loading") {
    return (
      <PageContainer header={{ title: isAr ? "الأدوار والصلاحيات" : "Rôles & Permissions" }} dir={dir}>
        <DataState.Loading rows={4} />
      </PageContainer>
    );
  }

  if (status === "error") {
    return (
      <PageContainer header={{ title: isAr ? "الأدوار والصلاحيات" : "Rôles & Permissions" }} dir={dir}>
        <DataState.Error
          title={isAr ? "تعذّر تحميل الأدوار" : "Impossible de charger les rôles"}
          message={isAr ? "تحقق من اتصالك بالإنترنت ثم أعد المحاولة." : "Vérifiez votre connexion puis réessayez."}
          retryLabel={isAr ? "إعادة المحاولة" : "Réessayer"}
          onRetry={load}
        />
      </PageContainer>
    );
  }

  if (status === "forbidden") {
    return (
      <PageContainer header={{ title: isAr ? "الأدوار والصلاحيات" : "Rôles & Permissions" }} dir={dir}>
        <Card className="max-w-md mx-auto">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">{isAr ? "غير مصرح" : "Accès refusé"}</h2>
            <p className="text-sm text-muted-foreground">
              {isAr
                ? "إدارة الأدوار والصلاحيات متاحة للمالك والمدير فقط."
                : "La gestion des rôles et permissions est réservée au propriétaire et à l’administrateur."}
            </p>
            <Button onClick={() => router.push("/projects")} className="gap-2">
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              {isAr ? "العودة للمشاريع" : "Retour aux projets"}
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      dir={dir}
      header={{
        title: isAr ? "الأدوار والصلاحيات" : "Rôles & Permissions",
        description: companyName
          ? isAr
            ? `مرجع صلاحيات أعضاء شركة «${companyName}» — قراءة فقط.`
            : `Référence des permissions de l’entreprise «${companyName}» — lecture seule.`
          : isAr
            ? "مرجع الأدوار والصلاحيات في منصتك — قراءة فقط."
            : "Référence des rôles et permissions de votre plateforme — lecture seule.",
        actions: (
          <Badge variant="outline" className="gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {isAr ? "قراءة فقط" : "Lecture seule"}
          </Badge>
        ),
      }}
    >
      {/* بطاقات وصف الأدوار */}
      <div className="grid gap-4 md:grid-cols-3">
        {ROLES.map((role) => {
          const count = matrix.filter((row) => row.roles[role]).length;
          return (
            <Card key={role}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{getRoleLabel(role, appLocale)}</CardTitle>
                  <Badge variant="outline">
                    {count} / {matrix.length}
                  </Badge>
                </div>
                <CardDescription>{getRoleDescription(role, appLocale)}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* مصفوفة الصلاحيات */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{isAr ? "مصفوفة الصلاحيات" : "Matrice des permissions"}</CardTitle>
          <CardDescription>
            {isAr
              ? "✓ تعني أن الدور يملك الصلاحية. تمرير أفقي على الموبايل."
              : "✓ signifie que le rôle possède la permission. Défilement horizontal sur mobile."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-40">{isAr ? "الصلاحية" : "Permission"}</TableHead>
                  <TableHead className="text-center">{getRoleLabel("owner", appLocale)}</TableHead>
                  <TableHead className="text-center">{getRoleLabel("admin", appLocale)}</TableHead>
                  <TableHead className="text-center">{getRoleLabel("member", appLocale)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrix.map((row) => (
                  <TableRow key={row.permission}>
                    <TableCell className="font-medium">{getPermissionLabel(row.permission, appLocale)}</TableCell>
                    {ROLES.map((role) => (
                      <TableCell key={role} className="text-center">
                        {row.roles[role] ? (
                          <span className="inline-flex items-center gap-1 text-primary">
                            <Check className="h-5 w-5" aria-hidden="true" />
                            <span className="sr-only">{isAr ? "نعم" : "Oui"}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <X className="h-5 w-5" aria-hidden="true" />
                            <span className="sr-only">{isAr ? "لا" : "Non"}</span>
                          </span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        {isAr
          ? "تعديل الصلاحيات من الواجهة غير متاح في هذه المرحلة; كل تغيير يتم عبر فريق تقني آمن."
          : "La modification des permissions n’est pas disponible à cette étape; chaque changement passe par une équipe technique sécurisée."}
      </p>
    </PageContainer>
  );
}