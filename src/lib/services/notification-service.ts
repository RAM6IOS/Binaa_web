import { createClient as createBrowserClient } from '../supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';

export interface Notification {
  id: string;
  user_id: string;
  title: string;           // العنوان الرئيسي
  title_ar?: string;
  title_fr?: string;
  body?: string;           // المحتوى الرئيسي
  content_ar?: string;
  content_fr?: string;
  type: string;
  entity_type?: string;
  entity_id?: string | null;
  is_read: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

export interface CreateNotificationInput {
  user_id: string;
  title: string;
  title_ar?: string;
  title_fr?: string;
  body?: string;
  content_ar?: string;
  content_fr?: string;
  type: string;
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, any>;
}

// دالة مساعدة لاختيار العميل
const getSupabase = (customClient?: SupabaseClient) => {
  return customClient || createBrowserClient();
};

export const notificationService = {

  async getNotifications(
    userId: string,
    limit = 15,
    offset = 0,
    customClient?: SupabaseClient
  ): Promise<Notification[]> {
    const supabase = getSupabase(customClient);

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching notifications:', error.message);
      throw error;
    }

    return data as Notification[];
  },

  async getUnreadCount(userId: string, customClient?: SupabaseClient): Promise<number> {
    const supabase = getSupabase(customClient);

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error fetching unread count:', error.message);
      return 0;
    }

    return count || 0;
  },

  async markAsRead(notificationId: string, userId: string, customClient?: SupabaseClient) {
    const supabase = getSupabase(customClient);

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  },

  async markAllAsRead(userId: string, customClient?: SupabaseClient) {
    const supabase = getSupabase(customClient);

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return true;
  },

  /** 
   * إنشاء إشعار جديد - الدالة الأهم 
   */
  async createNotification(
    data: CreateNotificationInput,
    customClient?: SupabaseClient
  ): Promise<Notification> {
    const supabase = getSupabase(customClient);

    const payload = {
      user_id: data.user_id,
      title: data.title,
      title_ar: data.title_ar || data.title,
      title_fr: data.title_fr || data.title,
      body: data.body,
      content_ar: data.content_ar,
      content_fr: data.content_fr,
      type: data.type,
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      metadata: data.metadata || {},
      is_read: false,
    };

    console.log('🛠️ Creating notification with payload:', payload);

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to create notification:', error.message);
      throw error;
    }

    console.log('✅ Notification created successfully:', notification);
    return notification as Notification;
  },

  async deleteNotification(notificationId: string, userId: string, customClient?: SupabaseClient) {
    const supabase = getSupabase(customClient);

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  },

  // Realtime Subscription
  subscribe(userId: string, callback: (payload: any) => void) {
    const supabase = createBrowserClient();

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }
};