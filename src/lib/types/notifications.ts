/**
 * واجهات TypeScript لنظام الإشعارات في منصة Binaa
 * TypeScript Interfaces for the Notification System in Binaa Platform
 */

export type NotificationType =
  | 'new_task_assigned'           // تعيين مهمة جديدة
  | 'project_deadline_approaching' // اقتراب موعد تسليم المشروع
  | 'maintenance_due'             // استحقاق صيانة المعدة
  | 'worker_added_to_project'     // إضافة عامل للمشروع
  | 'document_uploaded'           // رفع مستند جديد
  | 'system'                      // إشعار نظام عام
  | 'mention';                    // ذكر شخص

export interface Notification {
  id: string;
  user_id: string;

  // الحقول الرئيسية (مستخدمة في معظم الأماكن)
  title: string;           // العنوان الافتراضي
  body?: string;           // المحتوى الافتراضي

  // الحقول الثنائية اللغة (موصى بها)
  title_ar?: string;
  title_fr?: string;
  content_ar?: string;
  content_fr?: string;

  type: NotificationType | string;
  entity_type?: string | null;
  entity_id?: string | null;

  is_read: boolean;        // ← يجب أن يكون is_read (مطابق لقاعدة البيانات)
  read_at?: string | null;

  metadata?: Record<string, any>;   // بيانات إضافية مثل project_name, task_title, etc.

  created_at: string;
  updated_at?: string;
}

/**
 * واجهة إدخال إنشاء إشعار جديد
 */
export interface CreateNotificationInput {
  user_id: string;
  title: string;
  title_ar?: string;
  title_fr?: string;
  body?: string;
  content_ar?: string;
  content_fr?: string;
  type: NotificationType | string;
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, any>;
}