"use client";

import { use, useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Loader2, MoreVertical, Edit, Trash2, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Project, ProjectStatus, ProjectType } from "@/lib/types/projects";
import { ProgressBar } from "@/components/projects/ProgressBar";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { ProjectTypeBadge } from "@/components/projects/ProjectTypeBadge";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectsListPage({ params }: { params: Promise<{ locale: string }> }) {
  const unwrappedParams = use(params);
  const { locale } = unwrappedParams;
  const isAr = locale === 'ar';

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [wilayaFilter, setWilayaFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data as Project[] || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error(isAr ? 'خطأ في جلب المشاريع' : 'Erreur lors de la récupération des projets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();

    const supabase = createClient();
    const channel = supabase
      .channel('projects_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        fetchProjects();
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(channel); 
    };
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from('projects').delete().eq('id', id);
      
      if (!error) {
        toast.success(isAr ? 'تم حذف المشروع بنجاح' : 'Projet supprimé avec succès');
        fetchProjects(); // Refresh the list
      } else {
        throw error;
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error(isAr ? 'حدث خطأ' : 'Une erreur est survenue');
    }
  };

  const filteredProjects = projects.filter(p => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = (p.name || '').toLowerCase().includes(term) || (p.contract_number || '').toLowerCase().includes(term);
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesWilaya = wilayaFilter === 'all' || p.wilaya === wilayaFilter;
    const matchesType = typeFilter === 'all' || p.project_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesWilaya && matchesType;
  });

  const uniqueWilayas = Array.from(new Set(projects.map(p => p.wilaya))).filter(Boolean);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{isAr ? 'المشاريع' : 'Projets'}</h2>
          <p className="text-slate-500 mt-1">{isAr ? 'إدارة ومتابعة جميع المشاريع النشطة' : 'Gérer et suivre tous les projets actifs'}</p>
        </div>
        <CreateProjectDialog isAr={isAr} onSuccess={fetchProjects} />
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full md:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rtl:right-3 rtl:left-auto" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'ابحث (الاسم، رقم العقد)...' : 'Rechercher (Nom, Contrat)...'} 
                className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-md text-sm rtl:pr-10 rtl:pl-4 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={isAr ? "الحالة" : "Statut"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? "كل الحالات" : "Tous"}</SelectItem>
                  <SelectItem value="planning">{isAr ? "قيد التخطيط" : "En planification"}</SelectItem>
                  <SelectItem value="in_progress">{isAr ? "قيد الإنجاز" : "En cours"}</SelectItem>
                  <SelectItem value="completed">{isAr ? "مكتمل" : "Terminé"}</SelectItem>
                  <SelectItem value="delayed">{isAr ? "متأخر" : "En retard"}</SelectItem>
                  <SelectItem value="cancelled">{isAr ? "ملغى" : "Annulé"}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={wilayaFilter} onValueChange={setWilayaFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder={isAr ? "الولاية" : "Wilaya"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? "كل الولايات" : "Toutes"}</SelectItem>
                  {uniqueWilayas.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={isAr ? "نوع المشروع" : "Type"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? "كل الأنواع" : "Tous"}</SelectItem>
                  <SelectItem value="road">{isAr ? "طرق" : "Route"}</SelectItem>
                  <SelectItem value="bridge">{isAr ? "جسور" : "Pont"}</SelectItem>
                  <SelectItem value="housing">{isAr ? "سكن" : "Logement"}</SelectItem>
                  <SelectItem value="school">{isAr ? "مدرسة" : "École"}</SelectItem>
                  <SelectItem value="hospital">{isAr ? "مستشفى" : "Hôpital"}</SelectItem>
                  <SelectItem value="infrastructure">{isAr ? "بنية تحتية" : "Infrastructure"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center space-x-4 space-x-reverse">
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900 border-y">
                  <TableRow>
                    <TableHead className="w-[250px]">{isAr ? 'اسم المشروع' : 'Nom du projet'}</TableHead>
                    <TableHead>{isAr ? 'النوع' : 'Type'}</TableHead>
                    <TableHead>{isAr ? 'الولاية' : 'Wilaya'}</TableHead>
                    <TableHead>{isAr ? 'الحالة' : 'Statut'}</TableHead>
                    <TableHead>{isAr ? 'تاريخ البدء' : 'Date début'}</TableHead>
                    <TableHead>{isAr ? 'تاريخ الانتهاء' : 'Date de fin'}</TableHead>
                    <TableHead className="w-[150px]">{isAr ? 'التقدم' : 'Progrès'}</TableHead>
                    <TableHead>{isAr ? 'الميزانية' : 'Budget'}</TableHead>
                    <TableHead className="text-right">{isAr ? 'إجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                        {isAr ? 'لا توجد مشاريع مطابقة' : 'Aucun projet trouvé'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProjects.map((project) => (
                      <TableRow key={project.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                        <TableCell>
                          <Link href={`/projects/${project.id}`} className="font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline">
                            {project.name}
                          </Link>
                          {project.contract_number && (
                            <div className="text-xs text-slate-500 mt-1 font-mono">{project.contract_number}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <ProjectTypeBadge type={project.project_type} isAr={isAr} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                            <MapPin className="w-3.5 h-3.5" /> {project.wilaya}
                          </div>
                        </TableCell>
                        <TableCell>
                          <ProjectStatusBadge status={project.status} isAr={isAr} />
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                          {project.start_date}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                          {project.expected_end_date}
                        </TableCell>
                        <TableCell>
                          <ProgressBar progress={project.progress} status={project.status} className="w-full" />
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {project.budget.toLocaleString()} <span className="text-[10px] text-slate-500">DZD</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rtl:text-right">
                              <DropdownMenuItem asChild>
                                <Link href={`/projects/${project.id}`} className="cursor-pointer w-full">
                                  {isAr ? 'عرض التفاصيل' : 'Voir les détails'}
                                </Link>
                              </DropdownMenuItem>
                              <CreateProjectDialog 
                                isAr={isAr} 
                                onSuccess={fetchProjects} 
                                project={project}
                                trigger={
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer gap-2">
                                    <Edit className="w-4 h-4" />
                                    {isAr ? 'تعديل' : 'Modifier'}
                                  </DropdownMenuItem>
                                }
                              />
                              <DropdownMenuItem 
                                className="text-red-600 cursor-pointer gap-2" 
                                onClick={() => handleDelete(project.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                                {isAr ? 'حذف' : 'Supprimer'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
