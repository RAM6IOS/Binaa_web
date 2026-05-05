"use client";

import { use, useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Truck, MapPin, MoreVertical, Settings, Edit, Trash2 } from "lucide-react";
import { equipmentService } from "@/lib/services/equipment-service";
import { Equipment } from "@/lib/types/projects";
import { AddEquipmentDialog } from "@/components/equipment/AddEquipmentDialog";
import { EquipmentStatusBadge } from "@/components/equipment/EquipmentStatusBadge";
import { MaintenanceStatusBadge } from "@/components/equipment/MaintenanceStatusBadge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function EquipmentListPage({ params }: { params: Promise<{ locale: string }> }) {
  const unwrappedParams = use(params);
  const { locale } = unwrappedParams;
  const isAr = locale === 'ar';

  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filters
  const [wilayaFilter, setWilayaFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [maintenanceFilter, setMaintenanceFilter] = useState<string>('all');

  const fetchEquipment = async () => {
    setIsLoading(true);
    try {
      const data = await equipmentService.getAll();
      setEquipment(data);
    } catch (error) {
      toast.error(isAr ? 'فشل تحميل المعدات' : 'Échec du chargement des équipements');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm(isAr ? 'هل أنت متأكد من حذف هذه المعدة؟' : 'Êtes-vous sûr de vouloir supprimer cet équipement?')) return;
    try {
      await equipmentService.delete(id);
      toast.success(isAr ? 'تم حذف المعدات بنجاح' : 'Équipement supprimé avec succès');
      fetchEquipment(); // Refresh the list
    } catch (error) {
      toast.error(isAr ? 'حدث خطأ' : 'Une erreur est survenue');
    }
  };

  const filteredEquipment = equipment.filter(e => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = (
      (e.name || '').toLowerCase().includes(term) || 
      (e.serial_number || '').toLowerCase().includes(term)
    );
    
    const matchesWilaya = wilayaFilter === 'all' || e.wilaya === wilayaFilter;
    const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    const matchesMaintenance = maintenanceFilter === 'all' || e.maintenance_status === maintenanceFilter;

    return matchesSearch && matchesWilaya && matchesCategory && matchesStatus && matchesMaintenance;
  });

  const uniqueWilayas = Array.from(new Set(equipment.map(e => e.wilaya))).filter(Boolean);
  const uniqueCategories = Array.from(new Set(equipment.map(e => e.category))).filter(Boolean);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{isAr ? 'العتاد والمعدات' : 'Équipement & Matériel'}</h2>
          <p className="text-slate-500 mt-1">{isAr ? 'إدارة المعدات الثقيلة والآلات وتتبع حالتها' : 'Gérer les engins lourds, les machines et suivre leur état'}</p>
        </div>
        <AddEquipmentDialog isAr={isAr} onSuccess={fetchEquipment} />
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
                placeholder={isAr ? 'ابحث عن عتاد (الاسم، الرقم التسلسلي...)' : 'Rechercher (Nom, SN...)'} 
                className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-md text-sm rtl:pr-10 rtl:pl-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-transparent"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <Select value={wilayaFilter} onValueChange={setWilayaFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder={isAr ? "الولاية" : "Wilaya"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? "كل الولايات" : "Toutes"}</SelectItem>
                  {uniqueWilayas.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={isAr ? "الفئة" : "Catégorie"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? "كل الفئات" : "Toutes"}</SelectItem>
                  {uniqueCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder={isAr ? "الحالة" : "Statut"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? "كل الحالات" : "Tous"}</SelectItem>
                  <SelectItem value="available">{isAr ? "متاح" : "Disponible"}</SelectItem>
                  <SelectItem value="in_use">{isAr ? "قيد الاستخدام" : "En service"}</SelectItem>
                  <SelectItem value="maintenance">{isAr ? "صيانة" : "Maintenance"}</SelectItem>
                  <SelectItem value="out_of_service">{isAr ? "خارج الخدمة" : "Hors service"}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={maintenanceFilter} onValueChange={setMaintenanceFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={isAr ? "حالة الصيانة" : "Maintenance"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isAr ? "الكل" : "Tous"}</SelectItem>
                  <SelectItem value="up_to_date">{isAr ? "محدث" : "À jour"}</SelectItem>
                  <SelectItem value="due_soon">{isAr ? "قريباً" : "Prochainement"}</SelectItem>
                  <SelectItem value="overdue">{isAr ? "متأخر" : "En retard"}</SelectItem>
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
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900 border-y">
                  <TableRow>
                    <TableHead className="w-[280px]">{isAr ? 'المعدة' : 'Équipement'}</TableHead>
                    <TableHead>{isAr ? 'العلامة / الموديل' : 'Marque / Modèle'}</TableHead>
                    <TableHead>{isAr ? 'الرقم التسلسلي' : 'N° Série'}</TableHead>
                    <TableHead>{isAr ? 'الأجر اليومي' : 'Taux/Jour'}</TableHead>
                    <TableHead>{isAr ? 'الولاية' : 'Wilaya'}</TableHead>
                    <TableHead>{isAr ? 'الحالة' : 'Statut'}</TableHead>
                    <TableHead>{isAr ? 'الصيانة' : 'Maint.'}</TableHead>
                    <TableHead className="text-right">{isAr ? 'إجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEquipment.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                        <div className="flex flex-col items-center gap-2">
                          <Truck className="w-8 h-8 text-slate-300" />
                          <p>{isAr ? 'لا توجد معدات مطابقة' : 'Aucun équipement trouvé'}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEquipment.map((item) => (
                      <TableRow key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {item.photo_url ? (
                                <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <Truck className="w-5 h-5 text-emerald-600" />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-slate-100">
                                {item.name}
                              </div>
                              <div className="text-xs text-slate-500 capitalize">{item.category}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="font-medium">{item.brand}</span>
                            <span className="text-slate-500 ml-1">({item.model})</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                            {item.serial_number}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {item.daily_rate.toLocaleString()} <span className="text-[10px] text-slate-500">DZD</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                            <MapPin className="w-3.5 h-3.5" /> {item.wilaya}
                          </div>
                        </TableCell>
                        <TableCell>
                          <EquipmentStatusBadge status={item.status} isAr={isAr} />
                        </TableCell>
                        <TableCell>
                          <MaintenanceStatusBadge status={item.maintenance_status} isAr={isAr} />
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rtl:text-right">
                              <AddEquipmentDialog 
                                isAr={isAr} 
                                onSuccess={fetchEquipment} 
                                equipment={item}
                                trigger={
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer gap-2">
                                    <Edit className="w-4 h-4" />
                                    {isAr ? 'تعديل' : 'Modifier'}
                                  </DropdownMenuItem>
                                }
                              />
                              <DropdownMenuItem 
                                className="text-red-600 cursor-pointer gap-2" 
                                onClick={() => handleDelete(item.id)}
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
