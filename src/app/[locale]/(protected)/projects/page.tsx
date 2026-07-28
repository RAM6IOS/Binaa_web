"use client";

import {
  use,
  useEffect,
  useState,
  useCallback,
  useMemo,
  memo,
} from "react";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/routing";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  MoreVertical,
  Edit,
  Trash2,
  MapPin,
  LayoutGrid,
  Construction,
  ChevronLeft,
  ChevronRight,
  Calendar,
  TrendingUp,
  X,
  Filter,
} from "lucide-react";
import { projectsService } from "@/lib/services/projects-service";
import { Project } from "@/lib/types/projects";
import { ProgressBar } from "@/components/projects/ProgressBar";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { ProjectTypeBadge } from "@/components/projects/ProjectTypeBadge";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { DeleteConfirmationDialog } from "@/components/ui/DeleteConfirmationDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";

// ────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────
const PAGE_SIZE = 10;

// ────────────────────────────────────────────
// Skeleton Components (memoized)
// ────────────────────────────────────────────
const MobileCardSkeleton = memo(function MobileCardSkeleton() {
  return (
    <div className="mx-3 my-2 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-slate-900 space-y-3">
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-3/4 rounded-lg" />
          <Skeleton className="h-4 w-1/3 rounded-full" />
        </div>
        <Skeleton className="h-12 w-12 rounded-full shrink-0" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-4 w-24 rounded" />
        <Skeleton className="h-4 w-20 rounded" />
      </div>
      <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-14 rounded" />
          <Skeleton className="h-3 w-8 rounded" />
        </div>
        <Skeleton className="h-2.5 w-full rounded-full" />
      </div>
    </div>
  );
});

const TableRowSkeleton = memo(function TableRowSkeleton() {
  return (
    <TableRow>
      <TableCell className="ps-8 py-5">
        <Skeleton className="h-5 w-40 rounded-lg mb-2" />
        <Skeleton className="h-3.5 w-24 rounded" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20 rounded mb-2" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24 rounded mb-1" />
        <Skeleton className="h-4 w-24 rounded" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-24 rounded-full" />
      </TableCell>
      <TableCell className="w-[180px]">
        <div className="flex items-center gap-3">
          <Skeleton className="h-2 flex-1 rounded-full" />
          <Skeleton className="h-4 w-8 rounded" />
        </div>
      </TableCell>
      <TableCell className="pe-8 text-end">
        <Skeleton className="h-9 w-9 rounded-full ms-auto" />
      </TableCell>
    </TableRow>
  );
});

// ────────────────────────────────────────────
// Project Cover Image (next/image optimized)
// ────────────────────────────────────────────
const ProjectCoverImage = memo(function ProjectCoverImage({
  src,
  alt,
  priority = false,
}: {
  src: string;
  alt: string;
  priority?: boolean;
}) {
  return (
    <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="40px"
        quality={80}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        className="object-cover"
      />
    </div>
  );
});

// ────────────────────────────────────────────
// Stats Bar (summary cards above table)
// ────────────────────────────────────────────
const StatsBar = memo(function StatsBar({
  projects,
  isAr,
}: {
  projects: Project[];
  isAr: boolean;
}) {
  const stats = useMemo(() => {
    const total = projects.length;
    const inProgress = projects.filter((p) => p.status === "in_progress").length;
    const delayed = projects.filter((p) => p.status === "delayed").length;
    const avgProgress =
      total > 0
        ? Math.round(projects.reduce((acc, p) => acc + (p.progress || 0), 0) / total)
        : 0;
    return { total, inProgress, delayed, avgProgress };
  }, [projects]);

  const items = [
    {
      label: isAr ? "إجمالي" : "Total",
      value: stats.total,
      icon: <LayoutGrid size={14} className="text-blue-500" />,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      label: isAr ? "جارية" : "En cours",
      value: stats.inProgress,
      icon: <TrendingUp size={14} className="text-emerald-500" />,
      color: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: isAr ? "متأخرة" : "Retard",
      value: stats.delayed,
      icon: <Calendar size={14} className="text-orange-500" />,
      color: "text-orange-600 dark:text-orange-400",
    },
    {
      label: isAr ? "متوسط الإنجاز" : "Moy. progrès",
      value: `${stats.avgProgress}%`,
      icon: <TrendingUp size={14} className="text-purple-500" />,
      color: "text-purple-600 dark:text-purple-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 mb-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-2.5 sm:gap-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl px-3.5 sm:px-4 py-3 shadow-sm"
        >
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 shrink-0">
            {item.icon}
          </div>
          <div className="text-start min-w-0">
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
              {item.label}
            </p>
            <p className={`text-base sm:text-lg font-black leading-none mt-0.5 ${item.color}`}>
              {item.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
});

// ────────────────────────────────────────────
// Mobile Project Card (memoized)
// ────────────────────────────────────────────
const MobileProjectCard = memo(function MobileProjectCard({
  p,
  isAr,
  refresh,
  askDelete,
  isPriority,
  onEdit,
}: {
  p: Project;
  isAr: boolean;
  refresh: () => void;
  askDelete: () => void;
  isPriority: boolean;
  onEdit: (project: Project) => void;
}) {
  return (
    <Link
      href={`/projects/${p.id}`}
      className="block mx-3 my-2 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-slate-900 shadow-sm active:shadow-none active:scale-[0.98] active:bg-slate-50 dark:active:bg-slate-800/60 transition-all duration-150"
    >
      {/* Row 1: name + action menu */}
      <div className="flex items-start gap-3 justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {p.cover_image && (
            <ProjectCoverImage
              src={p.cover_image}
              alt={p.name}
              priority={isPriority}
            />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-black text-[15px] text-slate-900 dark:text-slate-50 leading-tight truncate">
              {p.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant="secondary"
                className="text-[9px] uppercase font-bold tabular-nums h-4"
              >
                #{p.contract_number || "N/A"}
              </Badge>
            </div>
          </div>
        </div>
        {/* 48px touch target for action menu */}
        <div
          className="shrink-0 -m-1"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <ActionMenu p={p} isAr={isAr} refresh={refresh} askDelete={askDelete} onEdit={onEdit} />
        </div>
      </div>

      {/* Row 2: status + type badges — unified size */}
      <div className="flex items-center gap-2 mt-3">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 ring-1 ring-blue-200/50 dark:ring-blue-800/50">
          {isAr
            ? p.status === "planning" ? "قيد التخطيط"
            : p.status === "in_progress" ? "قيد الإنجاز"
            : p.status === "completed" ? "مكتمل"
            : p.status === "delayed" ? "متأخر"
            : "ملغى"
            : p.status === "planning" ? "Planification"
            : p.status === "in_progress" ? "En cours"
            : p.status === "completed" ? "Terminé"
            : p.status === "delayed" ? "En retard"
            : "Annulé"}
        </span>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 ring-1 ring-slate-200/50 dark:ring-slate-700/50">
          {isAr
            ? p.project_type === "road" ? "طرق"
            : p.project_type === "bridge" ? "جسور"
            : p.project_type === "housing" ? "سكن"
            : p.project_type === "school" ? "مدرسة"
            : p.project_type === "hospital" ? "مستشفى"
            : "بنية تحتية"
            : p.project_type === "road" ? "Route"
            : p.project_type === "bridge" ? "Pont"
            : p.project_type === "housing" ? "Logement"
            : p.project_type === "school" ? "École"
            : p.project_type === "hospital" ? "Hôpital"
            : "Infrastructure"}
        </span>
      </div>

      {/* Row 3: wilaya + budget */}
      <div className="flex items-center justify-between gap-3 mt-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 min-w-0">
          <MapPin size={13} className="text-red-500 shrink-0" />
          <span className="font-semibold truncate">{p.wilaya}</span>
        </div>
        <div className="shrink-0 font-black text-slate-900 dark:text-slate-100 tabular-nums text-[11px] whitespace-nowrap">
          {(p.budget ?? 0).toLocaleString("ar-DZ")}{" "}
          <span className="text-[9px] opacity-60 font-bold tracking-tight">دج</span>
        </div>
      </div>

      {/* Row 4: prominent progress bar */}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {isAr ? "الإنجاز" : "Avancement"}
          </span>
          <span className="text-xs font-black tabular-nums text-slate-700 dark:text-slate-300">
            {p.progress ?? 0}%
          </span>
        </div>
        <ProgressBar
          progress={p.progress ?? 0}
          status={p.status}
          className="h-2.5 rounded-full"
          showText={false}
        />
      </div>

      {/* Tappable indicator — arrow + subtle text */}
      <div className="flex items-center justify-end gap-1 mt-2.5 opacity-40">
        <span className="text-[9px] font-bold uppercase tracking-widest">
          {isAr ? "فتح" : "Ouvrir"}
        </span>
        <ChevronLeft
          size={12}
          className="rtl:rotate-180"
        />
      </div>
    </Link>
  );
});

// ────────────────────────────────────────────
// Desktop Table Row (memoized)
// ────────────────────────────────────────────
const DesktopTableRow = memo(function DesktopTableRow({
  p,
  isAr,
  refresh,
  askDelete,
  isPriority,
  onEdit,
}: {
  p: Project;
  isAr: boolean;
  refresh: () => void;
  askDelete: () => void;
  isPriority: boolean;
  onEdit: (project: Project) => void;
}) {
  const router = useRouter();
  return (
    <TableRow
      className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors duration-100 cursor-pointer"
      onClick={() => router.push(`/projects/${p.id}`)}
    >
      <TableCell className="ps-8 py-4 font-bold">
        <div className="flex items-center gap-3">
          {p.cover_image && (
            <ProjectCoverImage
              src={p.cover_image}
              alt={p.name}
              priority={isPriority}
            />
          )}
          <div className="min-w-0">
            <Link
              href={`/projects/${p.id}`}
              className="text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 block transition-colors font-bold text-sm leading-tight truncate max-w-[200px]"
              onClick={(e) => e.stopPropagation()}
            >
              {p.name}
            </Link>
            <code className="text-[9px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded opacity-60 font-mono tracking-tight mt-1 inline-block">
              #{p.contract_number || p.id.slice(0, 8)}
            </code>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
            <MapPin size={10} className="text-red-500 shrink-0" />
            <span className="truncate">{p.wilaya}</span>
          </div>
          <ProjectTypeBadge type={p.project_type} isAr={isAr} />
        </div>
      </TableCell>
      <TableCell className="text-[10.5px] font-mono text-slate-500 dark:text-slate-400">
        <div className="space-y-0.5 uppercase tracking-tighter font-bold">
          <p>Déb: {p.start_date}</p>
          <p>Fin: {p.expected_end_date}</p>
        </div>
      </TableCell>
      <TableCell>
        <ProjectStatusBadge status={p.status} isAr={isAr} />
      </TableCell>
      <TableCell className="w-[180px]">
        <div className="flex items-center gap-3">
          <ProgressBar
            progress={p.progress ?? 0}
            status={p.status}
            className="flex-1 h-1.5 shadow-inner"
            showText={false}
          />
          <span className="font-black text-xs w-8 text-center tabular-nums">
            {p.progress ?? 0}%
          </span>
        </div>
      </TableCell>
      <TableCell className="text-end pe-8">
        <ActionMenu p={p} isAr={isAr} refresh={refresh} askDelete={askDelete} onEdit={onEdit} />
      </TableCell>
    </TableRow>
  );
});

// ────────────────────────────────────────────
// Pagination Component
// ────────────────────────────────────────────
const Pagination = memo(function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  isAr,
  totalCount,
  pageSize,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  isAr: boolean;
  totalCount: number;
  pageSize: number;
}) {
  if (totalPages <= 1) return null;
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalCount);

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
    .reduce<(number | "...")[]>((acc, p, idx, arr) => {
      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
        {isAr
          ? `عرض ${start}–${end} من ${totalCount} مشروع`
          : `Affichage ${start}–${end} sur ${totalCount} projets`}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-xl"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label={isAr ? "الصفحة السابقة" : "Page précédente"}
        >
          {isAr ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </Button>
        {pages.map((item, idx) =>
          item === "..." ? (
            <span key={`ellipsis-${idx}`} className="text-xs text-slate-400 px-1">
              …
            </span>
          ) : (
            <Button
              key={item}
              variant={currentPage === item ? "default" : "outline"}
              size="icon"
              className="h-8 w-8 rounded-xl text-xs font-bold"
              onClick={() => onPageChange(item as number)}
              aria-current={currentPage === item ? "page" : undefined}
            >
              {item}
            </Button>
          )
        )}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-xl"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label={isAr ? "الصفحة التالية" : "Page suivante"}
        >
          {isAr ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
        </Button>
      </div>
    </div>
  );
});

// ────────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────────
export default function ProjectsListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const isAr = locale === "ar";

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editProject, setEditProject] = useState<Project | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [wilayaFilter, setWilayaFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await projectsService.getAll();
      setProjects(data || []);
    } catch {
      toast.error(
        isAr ? "خطأ في جلب بيانات المشاريع" : "Erreur de synchronisation"
      );
    } finally {
      setIsLoading(false);
    }
  }, [isAr]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (!isDeleteModalOpen) {
      const t = setTimeout(() => {
        document.body.style.pointerEvents = "auto";
      }, 150);
      return () => clearTimeout(t);
    }
  }, [isDeleteModalOpen]);

  useEffect(() => {
    if (!editProject) {
      const t = setTimeout(() => {
        document.body.style.pointerEvents = "auto";
      }, 150);
      return () => clearTimeout(t);
    }
  }, [editProject]);

  const askDelete = useCallback((id: string) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await projectsService.delete(itemToDelete);
      toast.success(isAr ? "تم حذف المشروع نهائياً ✓" : "Projet supprimé avec succès ✓");
      setProjects((prev) => prev.filter((p) => p.id !== itemToDelete));
    } catch {
      toast.error(
        isAr
          ? "فشل الحذف: قد يكون المشروع مرتبطاً ببيانات أخرى"
          : "Erreur: Projet lié à d'autres données"
      );
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  }, [itemToDelete, isAr]);

  const uniqueWilayas = useMemo(
    () => Array.from(new Set(projects.map((p) => p.wilaya))).filter(Boolean),
    [projects]
  );

  const hasActiveFilters = useMemo(
    () =>
      statusFilter !== "all" ||
      wilayaFilter !== "all" ||
      typeFilter !== "all" ||
      searchQuery.trim() !== "",
    [statusFilter, wilayaFilter, typeFilter, searchQuery]
  );

  const filterCount = useMemo(() => {
    let c = 0;
    if (statusFilter !== "all") c++;
    if (wilayaFilter !== "all") c++;
    if (typeFilter !== "all") c++;
    return c;
  }, [statusFilter, wilayaFilter, typeFilter]);

  const filteredProjects = useMemo(() => {
    const term = searchQuery.toLowerCase().trim();
    return projects.filter((p) => {
      const matchesSearch =
        !term ||
        (p.name || "").toLowerCase().includes(term) ||
        (p.contract_number || "").toLowerCase().includes(term) ||
        (p.wilaya || "").toLowerCase().includes(term);
      return (
        matchesSearch &&
        (statusFilter === "all" || p.status === statusFilter) &&
        (wilayaFilter === "all" || p.wilaya === wilayaFilter) &&
        (typeFilter === "all" || p.project_type === typeFilter)
      );
    });
  }, [projects, searchQuery, statusFilter, wilayaFilter, typeFilter]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE)),
    [filteredProjects.length]
  );

  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredProjects.slice(start, start + PAGE_SIZE);
  }, [filteredProjects, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, wilayaFilter, typeFilter]);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setStatusFilter("all");
    setWilayaFilter("all");
    setTypeFilter("all");
  }, []);

  return (
    <div
      className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12"
      dir={isAr ? "rtl" : "ltr"}
    >
      <DeleteConfirmationDialog
        isOpen={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        isAr={isAr}
        title={isAr ? "حذف المشروع" : "Supprimer le projet"}
        description={
          isAr
            ? "تحذير: هذا الإجراء سيمسح جميع بيانات المشروع، التقارير اليومية، سجلات العمال والعتاد المرتبطة به بشكل نهائي."
            : "Attention: Cela supprimera définitivement le projet ainsi que tous ses rapports et données associées."
        }
      />

      <CreateProjectDialog
        isAr={isAr}
        onSuccess={fetchProjects}
        project={editProject ?? undefined}
        open={!!editProject}
        onOpenChange={(open) => { if (!open) setEditProject(null); }}
        trigger={<span className="hidden" />}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div className="text-start">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50">
            {isAr ? "محفظة المشاريع" : "Portfolio Projets"}
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-1">
            {isAr
              ? "متابعة الورشات، الميزانيات، وحالات الإنجاز الميدانية"
              : "Suivi des chantiers et avancement réel"}
          </p>
        </div>
        <CreateProjectDialog isAr={isAr} onSuccess={fetchProjects} />
      </div>

      {!isLoading && projects.length > 0 && (
        <StatsBar projects={projects} isAr={isAr} />
      )}

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden rounded-2xl">
        <CardHeader className="py-4 px-5 sm:px-6 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col gap-3">
            <div className="relative w-full">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                id="projects-search"
                type="search"
                inputMode="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isAr
                    ? "بحث باسم المشروع أو رقم العقد..."
                    : "Nom du projet ou N° de marché..."
                }
                aria-label={isAr ? "بحث في المشاريع" : "Rechercher un projet"}
                className="w-full ps-10 pe-10 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-950 transition-shadow placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 rounded"
                  aria-label={isAr ? "مسح البحث" : "Effacer la recherche"}
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Mobile: single filter button + count */}
              <div className="md:hidden flex items-center gap-2 w-full">
                <MobileFilterSheet
                  isAr={isAr}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  wilayaFilter={wilayaFilter}
                  setWilayaFilter={setWilayaFilter}
                  typeFilter={typeFilter}
                  setTypeFilter={setTypeFilter}
                  uniqueWilayas={uniqueWilayas as string[]}
                  hasActiveFilters={hasActiveFilters}
                  clearFilters={clearFilters}
                  filterCount={filterCount}
                />
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-10 text-xs font-bold text-slate-500 hover:text-red-500 gap-1.5 rounded-xl"
                  >
                    <X size={13} />
                    {isAr ? "مسح" : "Effacer"}
                  </Button>
                )}
                {filteredProjects.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ms-auto text-[10px] font-black h-6 rounded-full"
                  >
                    {filteredProjects.length}
                  </Badge>
                )}
              </div>

              {/* Desktop: inline filter selects */}
              <div className="hidden md:flex flex-wrap items-center gap-2 w-full">
                <Filter size={13} className="text-slate-400 shrink-0" />
                <FilterSelect
                  value={statusFilter}
                  onChange={setStatusFilter}
                  isAr={isAr}
                  type="status"
                />
                <FilterSelect
                  value={wilayaFilter}
                  onChange={setWilayaFilter}
                  isAr={isAr}
                  options={uniqueWilayas as string[]}
                  type="wilaya"
                />
                <FilterSelect
                  value={typeFilter}
                  onChange={setTypeFilter}
                  isAr={isAr}
                  type="type"
                />
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-9 text-xs font-bold text-slate-500 hover:text-red-500 gap-1.5 rounded-xl"
                  >
                    <X size={12} />
                    {isAr ? "مسح الكل" : "Effacer"}
                  </Button>
                )}
                {filteredProjects.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ms-auto text-[10px] font-black h-6 rounded-full"
                  >
                    {filteredProjects.length}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading && projects.length === 0 ? (
            <>
              <div className="md:hidden">
                {[1, 2, 3, 4].map((i) => (
                  <MobileCardSkeleton key={i} />
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50 dark:bg-slate-900 border-y">
                    <TableRow>
                      {[
                        isAr ? "المشروع / العقد" : "Projet / Marché",
                        isAr ? "الولاية / النوع" : "Secteur",
                        isAr ? "الجدولة" : "Timing",
                        isAr ? "الوضعية" : "Statut",
                        isAr ? "التقدم" : "Progrès",
                        isAr ? "إجراءات" : "Actions",
                      ].map((h) => (
                        <TableHead
                          key={h}
                          className="ps-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500"
                        >
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <TableRowSkeleton key={i} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <>
              {/* 📱 Mobile */}
              <div className="md:hidden">
                {paginatedProjects.length === 0 ? (
                  <EmptyState isAr={isAr} hasFilters={hasActiveFilters} />
                ) : (
                  paginatedProjects.map((p, idx) => (
                    <MobileProjectCard
                      key={p.id}
                      p={p}
                      isAr={isAr}
                      refresh={fetchProjects}
                      askDelete={() => askDelete(p.id)}
                      isPriority={idx < 3}
                      onEdit={(proj) => setEditProject(proj)}
                    />
                  ))
                )}
              </div>

              {/* 🖥️ Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50 dark:bg-slate-900 border-y">
                    <TableRow className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <TableHead className="ps-8 py-4">
                        {isAr ? "المشروع / العقد" : "Projet / Marché"}
                      </TableHead>
                      <TableHead>{isAr ? "الولاية / النوع" : "Secteur"}</TableHead>
                      <TableHead>{isAr ? "الجدولة الزمنية" : "Timing"}</TableHead>
                      <TableHead>{isAr ? "الوضعية" : "Statut"}</TableHead>
                      <TableHead>{isAr ? "التقدم الميداني" : "Progrès"}</TableHead>
                      <TableHead className="text-end pe-8">
                        {isAr ? "إجراءات" : "Actions"}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-start">
                    {paginatedProjects.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <EmptyState isAr={isAr} hasFilters={hasActiveFilters} />
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedProjects.map((p, idx) => (
                        <DesktopTableRow
                          key={p.id}
                          p={p}
                          isAr={isAr}
                          refresh={fetchProjects}
                          askDelete={() => askDelete(p.id)}
                          isPriority={idx < 3}
                          onEdit={(proj) => setEditProject(proj)}
                        />
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                isAr={isAr}
                totalCount={filteredProjects.length}
                pageSize={PAGE_SIZE}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ────────────────────────────────────────────
// Helper Components
// ────────────────────────────────────────────

function FilterSelect({
  value,
  onChange,
  isAr,
  options,
  type,
}: {
  value: string;
  onChange: (v: string) => void;
  isAr: boolean;
  options?: string[];
  type: "status" | "wilaya" | "type";
}) {
  const placeholder =
    type === "status"
      ? isAr ? "الحالة" : "Statut"
      : type === "wilaya"
      ? isAr ? "الولاية" : "Wilaya"
      : isAr ? "النوع" : "Type";

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className="w-[120px] sm:w-[130px] rounded-xl h-9 font-bold text-[11px] uppercase tracking-tight shadow-sm border-slate-200 dark:border-slate-700"
        aria-label={placeholder}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="rounded-xl p-1">
        <SelectItem value="all" className="text-[11px] font-black uppercase">
          {isAr ? "الكل" : "Tous"}
        </SelectItem>
        {type === "wilaya" &&
          options?.map((w) => (
            <SelectItem key={w} value={w} className="text-xs font-medium">
              {w}
            </SelectItem>
          ))}
        {type === "status" && (
          <>
            <SelectItem value="planning" className="text-xs">{isAr ? "قيد التخطيط" : "En planification"}</SelectItem>
            <SelectItem value="in_progress" className="text-xs">{isAr ? "قيد الإنجاز" : "En cours"}</SelectItem>
            <SelectItem value="completed" className="text-xs">{isAr ? "مكتمل" : "Terminé"}</SelectItem>
            <SelectItem value="delayed" className="text-xs">{isAr ? "متأخر" : "En retard"}</SelectItem>
            <SelectItem value="cancelled" className="text-xs">{isAr ? "ملغى" : "Annulé"}</SelectItem>
          </>
        )}
        {type === "type" && (
          <>
            <SelectItem value="road" className="text-xs">{isAr ? "طرق" : "Route"}</SelectItem>
            <SelectItem value="bridge" className="text-xs">{isAr ? "جسور" : "Pont"}</SelectItem>
            <SelectItem value="housing" className="text-xs">{isAr ? "سكنات" : "Bâtiment"}</SelectItem>
            <SelectItem value="school" className="text-xs">{isAr ? "مدارس" : "École"}</SelectItem>
            <SelectItem value="hospital" className="text-xs">{isAr ? "مستشفيات" : "Hôpital"}</SelectItem>
            <SelectItem value="infrastructure" className="text-xs">{isAr ? "بنية تحتية" : "Infrastructure"}</SelectItem>
          </>
        )}
      </SelectContent>
    </Select>
  );
}

// ────────────────────────────────────────────
// Mobile Filter Sheet (bottom drawer)
// ────────────────────────────────────────────
function MobileFilterSheet({
  isAr,
  statusFilter,
  setStatusFilter,
  wilayaFilter,
  setWilayaFilter,
  typeFilter,
  setTypeFilter,
  uniqueWilayas,
  hasActiveFilters,
  clearFilters,
  filterCount,
}: {
  isAr: boolean;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  wilayaFilter: string;
  setWilayaFilter: (v: string) => void;
  typeFilter: string;
  setTypeFilter: (v: string) => void;
  uniqueWilayas: string[];
  hasActiveFilters: boolean;
  clearFilters: () => void;
  filterCount: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative h-10 rounded-xl font-bold text-xs gap-2 border-slate-200 dark:border-slate-700 shadow-sm"
        >
          <Filter size={14} />
          {isAr ? "فلترة" : "Filtrer"}
          {filterCount > 0 && (
            <span className="absolute -top-1.5 -end-1.5 h-5 min-w-5 px-1 flex items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-black">
              {filterCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl max-h-[85vh] overflow-y-auto"
      >
        <SheetHeader className="pb-2 ps-0">
          <SheetTitle className="text-lg font-black">
            {isAr ? "خيارات الفلترة" : "Filtres"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 py-4">
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              {isAr ? "الحالة" : "Statut"}
            </label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-12 rounded-xl font-bold text-sm">
                <SelectValue
                  placeholder={isAr ? "الكل" : "Tous"}
                />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-sm font-bold py-3">
                  {isAr ? "الكل" : "Tous"}
                </SelectItem>
                <SelectItem value="planning" className="text-sm py-3">
                  {isAr ? "قيد التخطيط" : "En planification"}
                </SelectItem>
                <SelectItem value="in_progress" className="text-sm py-3">
                  {isAr ? "قيد الإنجاز" : "En cours"}
                </SelectItem>
                <SelectItem value="completed" className="text-sm py-3">
                  {isAr ? "مكتمل" : "Terminé"}
                </SelectItem>
                <SelectItem value="delayed" className="text-sm py-3">
                  {isAr ? "متأخر" : "En retard"}
                </SelectItem>
                <SelectItem value="cancelled" className="text-sm py-3">
                  {isAr ? "ملغى" : "Annulé"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              {isAr ? "الولاية" : "Wilaya"}
            </label>
            <Select value={wilayaFilter} onValueChange={setWilayaFilter}>
              <SelectTrigger className="h-12 rounded-xl font-bold text-sm">
                <SelectValue
                  placeholder={isAr ? "الكل" : "Toutes"}
                />
              </SelectTrigger>
              <SelectContent className="rounded-xl max-h-60">
                <SelectItem value="all" className="text-sm font-bold py-3">
                  {isAr ? "الكل" : "Toutes"}
                </SelectItem>
                {uniqueWilayas.map((w) => (
                  <SelectItem key={w} value={w} className="text-sm py-3">
                    {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              {isAr ? "النوع" : "Type"}
            </label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-12 rounded-xl font-bold text-sm">
                <SelectValue
                  placeholder={isAr ? "الكل" : "Tous"}
                />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-sm font-bold py-3">
                  {isAr ? "الكل" : "Tous"}
                </SelectItem>
                <SelectItem value="road" className="text-sm py-3">
                  {isAr ? "طرق" : "Route"}
                </SelectItem>
                <SelectItem value="bridge" className="text-sm py-3">
                  {isAr ? "جسور" : "Pont"}
                </SelectItem>
                <SelectItem value="housing" className="text-sm py-3">
                  {isAr ? "سكنات" : "Bâtiment"}
                </SelectItem>
                <SelectItem value="school" className="text-sm py-3">
                  {isAr ? "مدارس" : "École"}
                </SelectItem>
                <SelectItem value="hospital" className="text-sm py-3">
                  {isAr ? "مستشفيات" : "Hôpital"}
                </SelectItem>
                <SelectItem value="infrastructure" className="text-sm py-3">
                  {isAr ? "بنية تحتية" : "Infrastructure"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={() => {
                clearFilters();
                setOpen(false);
              }}
              className="w-full h-12 rounded-xl font-bold text-sm text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 gap-2"
            >
              <X size={16} />
              {isAr ? "مسح جميع الفلاتر" : "Effacer tous les filtres"}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

const ActionMenu = memo(function ActionMenu({
  p,
  isAr,
  refresh,
  askDelete,
  onEdit,
}: {
  p: Project;
  isAr: boolean;
  refresh: () => void;
  askDelete: () => void;
  onEdit: (project: Project) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all h-12 w-12 shrink-0"
          aria-label={isAr ? "خيارات المشروع" : "Options du projet"}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical size={16} className="text-slate-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[180px] p-2 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800"
      >
        <DropdownMenuItem asChild>
          <Link
            href={`/projects/${p.id}`}
            className="cursor-pointer font-bold text-[11px] uppercase gap-2 py-3 rounded-xl"
          >
            <LayoutGrid size={14} className="text-blue-500" />
            {isAr ? "فتح الورشة" : "Consulter"}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => { e.stopPropagation(); onEdit(p); }}
          className="cursor-pointer font-bold text-[11px] uppercase gap-2 py-3 rounded-xl"
        >
          <Edit size={14} className="text-amber-500" />
          {isAr ? "تعديل" : "Modifier"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={askDelete}
          className="text-red-600 font-bold text-[11px] uppercase gap-2 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-950 focus:bg-red-50 dark:focus:bg-red-950"
        >
          <Trash2 size={14} />
          {isAr ? "حذف" : "Supprimer"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 text-start">
      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
        {label}
      </span>
      <div className="min-h-5 flex items-center">{value}</div>
    </div>
  );
}

function EmptyState({
  isAr,
  hasFilters,
}: {
  isAr: boolean;
  hasFilters: boolean;
}) {
  return (
    <div className="py-20 sm:py-28 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
        <Construction className="w-8 h-8 text-slate-400" />
      </div>
      <p className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">
        {hasFilters
          ? isAr ? "لا توجد نتائج للبحث الحالي" : "Aucun résultat trouvé"
          : isAr ? "لا توجد مشاريع مسجلة حالياً" : "Aucun chantier disponible"}
      </p>
      {hasFilters && (
        <p className="text-[11px] text-slate-400 mt-1.5">
          {isAr ? "حاول تغيير معايير البحث" : "Essayez de modifier vos filtres"}
        </p>
      )}
    </div>
  );
}
