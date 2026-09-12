/**
 * مصدر الصلاحيات الوحيد في المشروع.
 * أي فحص دور → تمر عبر can() / canAny() / assertCan() — ممنوع تكرار
 * if (role === 'owner') في الملفات.
 */

export type MemberRole = 'owner' | 'admin' | 'member';
export type Permission =
  | 'manage_team'
  | 'manage_company_settings'
  | 'manage_projects'
  | 'edit_field_data'
  | 'manage_procurement'
  | 'manage_finance'
  | 'manage_attendance'
  | 'view_projects';

export type AppLocale = 'ar' | 'fr';

/** كل الأدوار المتاحة (owner يُدار فقط عبر الدوران/الترحيل، لا من الواجهة العادية). */
export const ROLES: readonly MemberRole[] = ['owner', 'admin', 'member'];

/** كل الصلاحيات بترتيب العرض. */
export const PERMISSIONS: readonly Permission[] = [
  'manage_team',
  'manage_company_settings',
  'manage_projects',
  'edit_field_data',
  'manage_procurement',
  'manage_finance',
  'manage_attendance',
  'view_projects',
];

/** مصفوفة الأدوار ← الصلاحيات. */
export const ROLE_PERMISSIONS: Record<MemberRole, ReadonlySet<Permission>> = {
  owner: new Set<Permission>(PERMISSIONS),
  admin: new Set<Permission>([
    'manage_team',
    'manage_company_settings',
    'manage_projects',
    'edit_field_data',
    'manage_procurement',
    'manage_finance',
    'manage_attendance',
    'view_projects',
  ]),
  member: new Set<Permission>(['edit_field_data', 'manage_procurement', 'view_projects']),
};

/** هل يملك الدور صلاحية معينة؟ */
export function can(role: MemberRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  const allowed = ROLE_PERMISSIONS[role];
  return allowed ? allowed.has(permission) : false;
}

/** هل يملك الدور أيّاً من الصلاحيات المذكورة؟ */
export function canAny(role: MemberRole | null | undefined, permissions: Permission[]): boolean {
  return permissions.some((p) => can(role, p));
}

/** يتأكد من الصلاحية ويرمي خطأً واضحاً — يُستخدم في الخادم/API. */
export function assertCan(role: MemberRole | null | undefined, permission: Permission): void {
  if (!can(role, permission)) {
    throw new Error('غير مصرح بهذه العملية — صلاحية مطلوبة: ' + permission);
  }
}

const ROLE_LABELS: Record<MemberRole, Record<AppLocale, string>> = {
  owner: { ar: 'المالك', fr: 'Propriétaire' },
  admin: { ar: 'المدير', fr: 'Administrateur' },
  member: { ar: 'عضو', fr: 'Membre' },
};

const PERMISSION_LABELS: Record<Permission, Record<AppLocale, string>> = {
  manage_team: { ar: 'إدارة الفريق', fr: "Gérer l'équipe" },
  manage_company_settings: { ar: 'إدارة إعدادات الشركة', fr: "Gérer les réglages de l'entreprise" },
  manage_projects: { ar: 'إدارة المشاريع', fr: 'Gérer les projets' },
  edit_field_data: { ar: 'تحرير بيانات الميدان', fr: 'Modifier les données de terrain' },
  manage_procurement: { ar: 'إدارة التوريدات', fr: 'Gérer les achats' },
  manage_finance: { ar: 'إدارة المالية', fr: 'Gérer les finances' },
  manage_attendance: { ar: 'إدارة سجل الحضور', fr: "Gérer le registre de présence" },
  view_projects: { ar: 'عرض المشاريع', fr: 'Voir les projets' },
};

const ROLE_DESCRIPTIONS: Record<MemberRole, Record<AppLocale, string>> = {
  owner: {
    ar: 'الصلاحيات الكاملة على المنصة والشركة وكامل بياناتها.',
    fr: 'Accès complet à la plateforme, à l’entreprise et à toutes ses données.',
  },
  admin: {
    ar: 'إدارة الفريق والمشاريع والإعدادات التشغيلية دون صلاحيات مالك الشركة.',
    fr: 'Gère l’équipe, les projets et les réglages opérationnels sans les droits du propriétaire.',
  },
  member: {
    ar: 'التشغيل الميداني واليومي للمشاريع — بدون إدارة الفريق ولا المالية الحساسة.',
    fr: 'Opérations de terrain au quotidien — sans gestion d’équipe ni finances sensibles.',
  },
};

export function getRoleLabel(role: MemberRole, locale: AppLocale): string {
  return ROLE_LABELS[role]?.[locale] ?? role;
}

export function getPermissionLabel(permission: Permission, locale: AppLocale): string {
  return PERMISSION_LABELS[permission]?.[locale] ?? permission;
}

export function getRoleDescription(role: MemberRole, locale: AppLocale): string {
  return ROLE_DESCRIPTIONS[role]?.[locale] ?? '';
}

/** صفوف المصفوفة (صلاحية ← هل يملكها كل دور) للعرض في صفحة الأدوار. */
export interface PermissionsMatrixRow {
  permission: Permission;
  roles: Record<MemberRole, boolean>;
}

export function getPermissionsMatrix(): PermissionsMatrixRow[] {
  return PERMISSIONS.map((permission) => ({
    permission,
    roles: {
      owner: can('owner', permission),
      admin: can('admin', permission),
      member: can('member', permission),
    },
  }));
}