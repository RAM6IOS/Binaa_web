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
import { Link } from "@/i18n/routing";
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
  ArrowUpRight,
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
    <div className="p-5 space-y-4 border-b border-slate-100 dark:border-slate-800">
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-3/4 rounded-lg" />
          <Skeleton className="h-4 w-1/3 rounded-full" />
        </div>
        <Skeleton className="h-9 w-9 rounded-full shrink-0" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        ))}
      </div>
      <div className="space-y-1.5 pt-1">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-14 rounded" />
          <Skeleton className="h-3 w-8 rounded" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
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
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 shadow-sm"
        >
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
            {item.icon}
          </div>
          <div className="text-start min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
              {item.label}
            </p>
            <p className={`text-lg font-black leading-none mt-0.5 ${item.color}`}>
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
}: {
  p: Project;
  isAr: boolean;
  refresh: () => void;
  askDelete: () => void;
  isPriority: boolean;
}) {
  return (
    <div className="p-4 sm:p-5 space-y-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors duration-150 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="flex items-start gap-3 justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
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
              className="font-bold text-sm text-slate-900 dark:text-slate-50 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 leading-tight"
            >
              <span className="truncate">{p.name}</span>
              <ArrowUpRight size={13} className="shrink-0" />
            </Link>
            <Badge
              variant="secondary"
              className="text-[9px] uppercase font-bold tabular-nums mt-1 h-4"
            >
              #{p.contract_number || "N/A"}
            </Badge>
          </div>
        </div>
        <ActionMenu p={p} isAr={isAr} refresh={refresh} askDelete={askDelete} />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
        <InfoItem
          label={isAr ? "الحالة" : "Statut"}
          value={<ProjectStatusBadge status={p.status} isAr={isAr} />}
        />
        <InfoItem
          label={isAr ? "النوع" : "Type"}
          value={<ProjectTypeBadge type={p.project_type} isAr={isAr} />}
        />
        <InfoItem
          label={isAr ? "الولاية" : "Wilaya"}
          value={
            <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
              <MapPin size={11} className="text-red-500 shrink-0" />
              <span className="truncate">{p.wilaya}</span>
            </div>
          }
        />
        <InfoItem
          label={isAr ? "الميزانية" : "Budget"}
          value={
            <div className="font-black text-slate-900 dark:text-slate-100 tabular-nums text-[11px]">
              {(p.budget ?? 0).toLocaleString("fr-DZ")}{" "}
              <span className="text-[8px] opacity-50 font-bold">DZD</span>
            </div>
          }
        />
      </div>

      <div className="pt-1">
        <div className="flex justify-between text-[10px] font-black uppercase mb-1.5 text-slate-400 tracking-widest">
          <span>{isAr ? "الإنجاز" : "Avancement"}</span>
          <span>{p.progress ?? 0}%</span>
        </div>
        <ProgressBar
          progress={p.progress ?? 0}
          status={p.status}
          className="h-2 rounded-full"
          showText={false}
        />
      </div>
    </div>
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
}: {
  p: Project;
  isAr: boolean;
  refresh: () => void;
  askDelete: () => void;
  isPriority: boolean;
}) {
  return (
    <TableRow className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors duration-100">
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
        <ActionMenu p={p} isAr={isAr} refresh={refresh} askDelete={askDelete} />
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

const ActionMenu = memo(function ActionMenu({
  p,
  isAr,
  refresh,
  askDelete,
}: {
  p: Project;
  isAr: boolean;
  refresh: () => void;
  askDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all h-10 w-10 shrink-0"
          aria-label={isAr ? "خيارات المشروع" : "Options du projet"}
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
        <CreateProjectDialog
          isAr={isAr}
          onSuccess={refresh}
          project={p}
          trigger={
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              className="cursor-pointer font-bold text-[11px] uppercase gap-2 py-3 rounded-xl"
            >
              <Edit size={14} className="text-amber-500" />
              {isAr ? "تعديل" : "Modifier"}
            </DropdownMenuItem>
          }
        />
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
