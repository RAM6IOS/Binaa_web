"use client";

import { use, useEffect, useState, useCallback } from "react";
import { Link } from "@/i18n/routing";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, Loader2, MoreVertical, Edit, Trash2,
  MapPin, LayoutGrid, Construction, ArrowUpRight
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Project } from "@/lib/types/projects";
import { ProgressBar } from "@/components/projects/ProgressBar";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { ProjectTypeBadge } from "@/components/projects/ProjectTypeBadge";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { DeleteConfirmationDialog } from "@/components/ui/DeleteConfirmationDialog"; // تأكد من المسار
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function ProjectsListPage({ params }: { params: Promise<{ locale: string }> }) {
  const unwrappedParams = use(params);
  const { locale } = unwrappedParams;
  const isAr = locale === 'ar';

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // ─── إدارة حالة الحذف الموحد ───
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [wilayaFilter, setWilayaFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data as Project[] || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error(isAr ? 'خطأ في جلب بيانات المشاريع' : 'Erreur de synchronisation');
    } finally {
      setIsLoading(false);
    }
  }, [isAr]);

  useEffect(() => {
    fetchProjects();

    const supabase = createClient();
    const channel = supabase
      .channel('projects_db_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        fetchProjects();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchProjects]);

  // ─── منع تجمد الواجهة بعد الحذف ───
  useEffect(() => {
    if (!isDeleteModalOpen) {
      const timer = setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isDeleteModalOpen]);

  // ─── منطق الحذف ───
  const askDelete = (id: string) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('projects').delete().eq('id', itemToDelete);

      if (error) throw error;

      toast.success(isAr ? 'تم حذف المشروع نهائياً ✓' : 'Projet supprimé avec succès ✓');
      setProjects(prev => prev.filter(p => p.id !== itemToDelete));
    } catch (error) {
      toast.error(isAr ? 'فشل الحذف: قد يكون المشروع مرتبطاً ببيانات أخرى' : 'Erreur: Projet lié à d\'autres données');
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const filteredProjects = projects.filter(p => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = (p.name || '').toLowerCase().includes(term) || (p.contract_number || '').toLowerCase().includes(term);
    return matchesSearch &&
      (statusFilter === 'all' || p.status === statusFilter) &&
      (wilayaFilter === 'all' || p.wilaya === wilayaFilter) &&
      (typeFilter === 'all' || p.project_type === typeFilter);
  });

  const uniqueWilayas = Array.from(new Set(projects.map(p => p.wilaya))).filter(Boolean);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10" dir={isAr ? 'rtl' : 'ltr'}>

      {/* ─── المودال الموحد ─── */}
      <DeleteConfirmationDialog
        isOpen={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        isAr={isAr}
        title={isAr ? "حذف المشروع" : "Supprimer le projet"}
        description={isAr
          ? "تحذير: هذا الإجراء سيمسح جميع بيانات المشروع، التقارير اليومية، سجلات العمال والعتاد المرتبطة به بشكل نهائي."
          : "Attention: Cela supprimera définitivement le projet ainsi que tous ses rapports et données associées."}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div className="text-start">
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50">{isAr ? 'محفظة المشاريع' : 'Portfolio Projets'}</h2>
          <p className="text-slate-500 font-medium text-sm mt-1">{isAr ? 'متابعة الورشات، الميزانيات، وحالات الإنجاز الميدانية' : 'Suivi des chantiers et avancement réel'}</p>
        </div>
        <CreateProjectDialog isAr={isAr} onSuccess={fetchProjects} />
      </div>

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden rounded-2xl">
        <CardHeader className="py-6 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-col lg:flex-row items-center gap-4">
            {/* Search Box */}
            <div className="relative flex-1 w-full lg:max-w-md">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'بحث في المشاريع...' : 'Nom ou N° de marché...'}
                className="w-full ps-10 pe-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-950"
              />
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <FilterSelect value={statusFilter} onChange={setStatusFilter} isAr={isAr} type="status" />
              <FilterSelect value={wilayaFilter} onChange={setWilayaFilter} isAr={isAr} options={uniqueWilayas} type="wilaya" />
              <FilterSelect value={typeFilter} onChange={setTypeFilter} isAr={isAr} type="type" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading && projects.length === 0 ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
            </div>
          ) : (
            <>
              {/* 📱 Mobile Card View */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProjects.length === 0 ? (
                  <EmptyState isAr={isAr} />
                ) : (
                  filteredProjects.map((p) => (
                    <div key={p.id} className="p-5 space-y-4 hover:bg-slate-50/30">
                      <div className="flex justify-between items-start">
                        <div className="text-start space-y-1">
                          <Link href={`/projects/${p.id}`} className="font-bold text-blue-600 hover:underline flex items-center gap-1">
                            {p.name} <ArrowUpRight size={14} />
                          </Link>
                          <Badge variant="secondary" className="text-[9px] uppercase font-bold tabular-nums">#{p.contract_number || 'N/A'}</Badge>
                        </div>
                        <ActionMenu p={p} isAr={isAr} refresh={fetchProjects} askDelete={() => askDelete(p.id)} />
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <InfoItem label={isAr ? "الحالة" : "Statut"} value={<ProjectStatusBadge status={p.status} isAr={isAr} />} />
                        <InfoItem label={isAr ? "النوع" : "Type"} value={<ProjectTypeBadge type={p.project_type} isAr={isAr} />} />
                        <InfoItem label={isAr ? "الولاية" : "Wilaya"} value={<div className="flex items-center gap-1 font-bold"><MapPin size={12} className="text-red-500" />{p.wilaya}</div>} />
                        <InfoItem label={isAr ? "الميزانية" : "Budget"} value={<div className="font-black text-slate-900">{p.budget?.toLocaleString()} <span className="text-[8px] opacity-60 text-slate-400">DZD</span></div>} />
                      </div>

                      <div className="pt-2">
                        <div className="flex justify-between text-[10px] font-black uppercase mb-1.5 opacity-50 tracking-widest">
                          <span>{isAr ? "الإنجاز" : "Progress"}</span>
                          <span>{p.progress}%</span>
                        </div>
                        <ProgressBar progress={p.progress} status={p.status} className="h-2 rounded-full" />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* 🖥️ Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50 dark:bg-slate-900 border-y">
                    <TableRow className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <TableHead className="ps-8 py-4">{isAr ? 'المشروع / العقد' : 'Projet / Marché'}</TableHead>
                      <TableHead>{isAr ? 'الولاية / النوع' : 'Secteur'}</TableHead>
                      <TableHead>{isAr ? 'الجدولة الزمنية' : 'Timing'}</TableHead>
                      <TableHead>{isAr ? 'الوضعية' : 'Statut'}</TableHead>
                      <TableHead>{isAr ? 'التقدم الميداني' : 'Progrès'}</TableHead>
                      <TableHead className="text-right pe-8">{isAr ? 'إجراءات' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-start">
                    {filteredProjects.map((p) => (
                      <TableRow key={p.id} className="group hover:bg-slate-50/40 transition-colors">
                        <TableCell className="ps-8 py-4 font-bold">
                          <Link href={`/projects/${p.id}`} className="text-slate-900 hover:text-blue-600 block transition-colors">{p.name}</Link>
                          <code className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded opacity-60 font-mono tracking-tight mt-1 inline-block">ID: {p.id.slice(0, 8)}</code>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs text-slate-600"><MapPin size={10} className="text-red-500" />{p.wilaya}</div>
                            <ProjectTypeBadge type={p.project_type} isAr={isAr} />
                          </div>
                        </TableCell>
                        <TableCell className="text-[10.5px] font-mono text-slate-500">
                          <div className="space-y-0.5 uppercase tracking-tighter font-bold">
                            <p>Déb: {p.start_date}</p>
                            <p>Fin: {p.expected_end_date}</p>
                          </div>
                        </TableCell>
                        <TableCell><ProjectStatusBadge status={p.status} isAr={isAr} /></TableCell>
                        <TableCell className="w-[180px]">
                          <div className="flex items-center gap-3">
                            <ProgressBar progress={p.progress} status={p.status} className="flex-1 h-1.5 shadow-inner" />
                            <span className="font-black text-xs w-8 text-center">{p.progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pe-8">
                          <ActionMenu p={p} isAr={isAr} refresh={fetchProjects} askDelete={() => askDelete(p.id)} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Components المساعدة ──

function FilterSelect({ value, onChange, isAr, options, type }: any) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full md:w-[130px] rounded-xl h-10 font-bold text-xs uppercase tracking-tight shadow-sm border-slate-200">
        <SelectValue placeholder={isAr ? "تصفية" : "Filtre"} />
      </SelectTrigger>
      <SelectContent className="rounded-xl p-1">
        <SelectItem value="all" className="text-[11px] font-black uppercase">{isAr ? "كل الحالات" : "Tous"}</SelectItem>
        {type === 'wilaya' && options?.map((w: string) => <SelectItem key={w} value={w} className="text-xs">{w}</SelectItem>)}
        {type === 'status' && (
          <>
            <SelectItem value="in_progress">{isAr ? "قيد الإنجاز" : "En cours"}</SelectItem>
            <SelectItem value="completed">{isAr ? "مكتمل" : "Terminé"}</SelectItem>
            <SelectItem value="delayed">{isAr ? "متأخر" : "Retard"}</SelectItem>
          </>
        )}
        {type === 'type' && (
          <>
            <SelectItem value="road">{isAr ? "طرق" : "Route"}</SelectItem>
            <SelectItem value="bridge">{isAr ? "جسور" : "Pont"}</SelectItem>
            <SelectItem value="housing">{isAr ? "سكنات" : "Bâtiment"}</SelectItem>
          </>
        )}
      </SelectContent>
    </Select>
  );
}

function ActionMenu({ p, isAr, refresh, askDelete }: any) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full hover:bg-white hover:shadow-md transition-all h-9 w-9">
          <MoreVertical size={16} className="text-slate-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[170px] p-2 rounded-2xl shadow-2xl border-none">
        <DropdownMenuItem asChild>
          <Link href={`/projects/${p.id}`} className="cursor-pointer font-bold text-[11px] uppercase gap-2 py-3 rounded-xl">
            <LayoutGrid size={14} className="text-blue-500" /> {isAr ? "فتح الورشة" : "Consulter"}
          </Link>
        </DropdownMenuItem>
        <CreateProjectDialog
          isAr={isAr} onSuccess={refresh} project={p}
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer font-bold text-[11px] uppercase gap-2 py-3 rounded-xl">
              <Edit size={14} className="text-amber-500" /> {isAr ? "تعديل" : "Modifier"}
            </DropdownMenuItem>
          }
        />
        <DropdownMenuItem onClick={askDelete} className="text-red-600 font-bold text-[11px] uppercase gap-2 py-3 rounded-xl hover:bg-red-50 focus:bg-red-50">
          <Trash2 size={14} /> {isAr ? "حذف" : "Supprimer"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function InfoItem({ label, value }: { label: string, value: any }) {
  return (
    <div className="flex flex-col gap-1 text-start">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <div className="min-h-5 flex items-center">{value}</div>
    </div>
  );
}

function EmptyState({ isAr }: { isAr: boolean }) {
  return (
    <div className="py-24 text-center grayscale opacity-30">
      <Construction className="w-16 h-16 mx-auto mb-4" />
      <p className="font-black text-xs uppercase tracking-[0.2em]">{isAr ? "لا توجد مشاريع مسجلة حالياً" : "Aucun chantier disponible"}</p>
    </div>
  );
}