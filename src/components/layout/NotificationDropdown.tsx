"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bell,
  Check,
  Trash2,
  Loader2,
  AlertTriangle,
  UserPlus,
  FileText,
  Wrench,
  Clock,
  X,
  Inbox,
  ExternalLink
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar, fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { notificationService } from "@/lib/services/notification-service";
import { Notification } from "@/lib/types/notifications";
import { toast } from "sonner";

// قائمة الإشعارات التجريبية في حال عدم وجود جدول الإشعارات في قاعدة البيانات بعد
const getMockNotifications = (): Notification[] => [
  {
    id: "mock-1",
    user_id: "mock-user",
    title: "تم تعيين مهمة جديدة 🏗️",
    title_ar: "تم تعيين مهمة جديدة 🏗️",
    title_fr: "Nouvelle tâche assignée 🏗️",
    content_ar: "تم تعيينك لمهمة 'صب الخرسانة للأساسات' في مشروع ثانوية 1000 مسكن.",
    content_fr: "Vous avez été assigné à la tâche 'Coulage du béton' dans le projet Lycée 1000 places.",
    type: "new_task_assigned",
    is_read: false,
    created_at: new Date(Date.now() - 3600000).toISOString(), // قبل ساعة
    metadata: { project_id: "p-1" }
  },
  {
    id: "mock-2",
    user_id: "mock-user",
    title: "تنبيه: اقتراب موعد التسليم 📅",
    title_ar: "تنبيه: اقتراب موعد التسليم 📅",
    title_fr: "Alerte: Échéance proche 📅",
    content_ar: "تاريخ تسليم مشروع 'طريق الوزن الثقيل' هو بعد 5 أيام. يرجى تسريع العمل.",
    content_fr: "La date limite pour le projet 'Route CW 12' est dans 5 jours. Veuillez accélérer les travaux.",
    type: "project_deadline_approaching",
    is_read: false,
    created_at: new Date(Date.now() - 86400000).toISOString(), // قبل يوم
    metadata: { project_id: "p-2" }
  },
  {
    id: "mock-3",
    user_id: "mock-user",
    title: "صيانة مجدولة للمعدة 🛠️",
    title_ar: "صيانة مجدولة للمعدة 🛠️",
    title_fr: "Maintenance planifiée 🛠️",
    content_ar: "جرافة Caterpillar بحاجة لصيانة دورية بعد بلوغها 150 ساعة عمل.",
    content_fr: "Le bulldozer Caterpillar nécessite un entretien après 150 heures d'utilisation.",
    type: "maintenance_due",
    is_read: false,
    created_at: new Date(Date.now() - 172800000).toISOString(), // قبل يومين
  },
  {
    id: "mock-4",
    user_id: "mock-user",
    title: "تم رفع مستند جديد 📄",
    title_ar: "تم رفع مستند جديد 📄",
    title_fr: "Nouveau document partagé 📄",
    content_ar: "قام أحمد بن صويلح برفع 'المخطط الهندسي المعدل v2.pdf'.",
    content_fr: "Ahmed Ben Souilah a téléversé le document 'Plan d'ingénierie modifié v2.pdf'.",
    type: "document_uploaded",
    is_read: true,
    created_at: new Date(Date.now() - 259200000).toISOString(), // قبل 3 أيام
    metadata: { project_id: "p-1" }
  }
];

export function NotificationDropdown({ locale }: { locale: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isMockMode, setIsMockMode] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const isAr = locale === "ar";
  const supabase = createClient();

  // 1. جلب هوية المستخدم وجلب الإشعارات الأولية
  useEffect(() => {
    async function initUserAndFetch() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          await fetchNotifications();
        } else {
          // في حال عدم وجود مستخدم حقيقي في التطوير، نستخدم النمط التجريبي تلقائياً لتجنب توقف الواجهة
          console.info("No active user session found. Initializing mock notifications for preview.");
          setIsMockMode(true);
          setNotifications(getMockNotifications());
          setUnreadCount(3);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error initializing user notifications:", err);
        setIsMockMode(true);
        setNotifications(getMockNotifications());
        setUnreadCount(3);
        setIsLoading(false);
      }
    }

    initUserAndFetch();
  }, []);

  // 2. تفعيل الاشتراك في الوقت الفعلي (Realtime Live Updates)
  useEffect(() => {
    if (!userId || isMockMode) return;

    // الاشتراك في التغييرات
    const unsubscribe = notificationService.subscribe(userId, (payload) => {
      // إعادة جلب الإشعارات لتحديث القائمة والحساب
      fetchNotifications();

      // إظهار تنبيه منبثق لطيف للمستخدم في حال إضافة إشعار جديد غير مقروء
      if (payload.eventType === "INSERT" && !payload.new.is_read) {
        const newNotif = payload.new as Notification;
        toast.info(
          isAr ? newNotif.title_ar : newNotif.title_fr,
          {
            description: isAr ? newNotif.content_ar : newNotif.content_fr,
            icon: <Bell className="w-5 h-5 text-blue-500" />,
            duration: 5000,
          }
        );
      }
    });

    return () => {
      unsubscribe();
    };
  }, [userId, locale, isMockMode]);

  // 3. دالة إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // دالة جلب الإشعارات من API الخاص بنا
  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications?limit=25");

      if (!response.ok) {
        let errorMsg = "Failed to fetch";
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorData.details || errorMsg;
        } catch (_) { }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
        setIsMockMode(false);
      }
    } catch (err: any) {
      console.warn("Notifications API Error (Falling back to Mock Mode):", err.message);

      // تفعيل النمط التجريبي في حال عدم وجود الجدول في قاعدة البيانات
      setIsMockMode(true);
      setNotifications(getMockNotifications());
      setUnreadCount(3);
    } finally {
      setIsLoading(false);
    }
  };

  // دالة تحديد إشعار فردي كمقروء
  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // منع إغلاق القائمة

    // التحديث المحلي الفوري
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    toast.success(isAr ? "تم قراءة الإشعار" : "Notification lue");

    if (isMockMode) return; // في الوضع التجريبي نكتفي بالتحديث المحلي

    try {
      const response = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });

      if (!response.ok) throw new Error("Failed to update");
    } catch (err) {
      console.error("Error marking notification as read in database:", err);
    }
  };

  // دالة تحديد الكل كمقروء
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;

    // التحديث المحلي الفوري
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    toast.success(isAr ? "تم تحديد الكل كمقروء" : "Tout marquer comme lu");

    if (isMockMode) return; // في الوضع التجريبي نكتفي بالتحديث المحلي

    try {
      const response = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true })
      });

      if (!response.ok) throw new Error("Failed");
    } catch (err) {
      console.error("Error marking all as read in database:", err);
    }
  };

  // دالة حذف إشعار
  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // حذف من القائمة المحلية مع تأثير حركي فوري
    const target = notifications.find(n => n.id === id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (target && !target.is_read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    toast.success(isAr ? "تم حذف الإشعار" : "Notification supprimée");

    if (isMockMode || id.startsWith("mock-")) return; // في الوضع التجريبي نكتفي بالتحديث المحلي

    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "DELETE"
      });

      if (!response.ok) throw new Error("Failed to delete");
    } catch (err) {
      console.error("Error deleting notification from database:", err);
    }
  };

  // دالة الحصول على الأيقونة والألوان المناسبة لكل نوع إشعار
  const getNotificationConfig = (type: string) => {
    switch (type) {
      case "new_task_assigned":
        return {
          icon: <Clock className="w-5 h-5 text-blue-500 dark:text-blue-400" />,
          bgColor: "bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/30",
        };
      case "project_deadline_approaching":
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400" />,
          bgColor: "bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/30",
        };
      case "maintenance_due":
        return {
          icon: <Wrench className="w-5 h-5 text-rose-500 dark:text-rose-400" />,
          bgColor: "bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900/30",
        };
      case "worker_added_to_project":
        return {
          icon: <UserPlus className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />,
          bgColor: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/30",
        };
      case "document_uploaded":
        return {
          icon: <FileText className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />,
          bgColor: "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-100 dark:border-indigo-900/30",
        };
      default:
        return {
          icon: <Bell className="w-5 h-5 text-slate-500 dark:text-slate-400" />,
          bgColor: "bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/30",
        };
    }
  };

  // دالة تنسيق الوقت بلطف ثنائي اللغة
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, {
        addSuffix: true,
        locale: locale === "ar" ? ar : fr
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* زر التنبيهات الرئيسي */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative hover:bg-slate-100 dark:hover:bg-slate-800 transition-all rounded-full w-10 h-10 flex items-center justify-center"
      >
        <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        {unreadCount > 0 && (
          <div className={`absolute -top-1 -right-1 transition-transform duration-200 ${unreadCount > 0 ? 'scale-100' : 'scale-0'}`}>
            <Badge className="bg-red-500 hover:bg-red-600 text-white font-bold text-[10px] min-w-5 h-5 px-1 flex items-center justify-center border-2 border-white dark:border-slate-900 rounded-full">
              {unreadCount > 9 ? "+9" : unreadCount}
            </Badge>
          </div>
        )}
      </Button>

      {/* القائمة المنسدلة */}
      {isOpen && (
          <div
            dir={isAr ? "rtl" : "ltr"}
            className={`absolute top-12 ${isAr ? "left-0" : "right-0"} w-80 sm:w-96 max-h-[500px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 flex flex-col animate-fade-in`}
          >
            {/* رأس القائمة */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {isAr ? "الإشعارات" : "Notifications"}
                </span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold">
                    {unreadCount} {isAr ? "جديد" : "nouveaux"}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 h-7"
                  >
                    {isAr ? "قراءة الكل" : "Tout lire"}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* محتوى الإشعارات */}
            <div className="flex-1 max-h-[350px] overflow-y-auto">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  <p className="text-sm text-slate-400">
                    {isAr ? "جاري تحميل الإشعارات..." : "Chargement des notifications..."}
                  </p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800/40 flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-700">
                    <Inbox className="w-8 h-8 text-slate-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? "علبة الوارد فارغة" : "Boîte de réception vide"}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto">
                      {isAr ? "لا توجد إشعارات في الوقت الحالي." : "Aucune notification pour le moment."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {notifications.map((notification) => {
                      const config = getNotificationConfig(notification.type);
                      return (
                        <div
                          key={notification.id}
                          className={`p-4 transition-all hover:bg-slate-50/70 dark:hover:bg-slate-800/20 relative group border-r-4 ${notification.is_read
                              ? "border-r-transparent"
                              : "border-r-blue-500 bg-blue-50/20 dark:bg-blue-950/5"
                            }`}
                        >
                          <div className="flex gap-3">
                            {/* الأيقونة */}
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${config.bgColor} flex-shrink-0 shadow-sm`}>
                              {config.icon}
                            </div>

                            {/* تفاصيل الإشعار */}
                            <div className="flex-1 min-w-0 pr-2">
                              <h4 className={`text-sm font-semibold text-slate-800 dark:text-slate-200 truncate ${!notification.is_read && "text-slate-900 dark:text-white"}`}>
                                {isAr ? notification.title_ar : notification.title_fr}
                              </h4>
                              <p className={`text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed ${!notification.is_read && "text-slate-700 dark:text-slate-300 font-medium"}`}>
                                {isAr ? notification.content_ar : notification.content_fr}
                              </p>

                              {/* تاريخ ووقت الإشعار */}
                              <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400">
                                <Clock className="w-3 h-3" />
                                <span>{formatTime(notification.created_at)}</span>
                              </div>

                              {/* روابط الانتقال السريع في حال توفرها بالبيانات الوصفية */}
                              {notification.metadata?.project_id && (
                                <a
                                  href={`/${locale}/projects/${notification.metadata.project_id}`}
                                  onClick={() => setIsOpen(false)}
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline mt-2.5"
                                >
                                  <span>{isAr ? "عرض التفاصيل" : "Voir les détails"}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>

                            {/* أزرار التحكم الجانبية */}
                            <div className="flex flex-col gap-1 items-end opacity-60 group-hover:opacity-100 transition-opacity">
                              {!notification.is_read && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => handleMarkAsRead(notification.id, e)}
                                  className="w-7 h-7 rounded-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                                  title={isAr ? "تحديد كمقروء" : "Marquer comme lu"}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => handleDeleteNotification(notification.id, e)}
                                className="w-7 h-7 rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                                title={isAr ? "حذف الإشعار" : "Supprimer"}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* ذيل القائمة */}
            <div className="p-3 text-center border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
              <span className="text-[11px] text-slate-400">
                {isAr ? "منصة بناء لإدارة مشاريع الإنشاءات" : "Binaa - Construction Project Management"}
              </span>
            </div>
          </div>
      )}
    </div>
  );
}
