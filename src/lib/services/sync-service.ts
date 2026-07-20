import { db, SyncQueueItem } from '../db/offline-db';
import { createClient } from '../supabase/client';
import { checkNetworkStatus } from '../utils/network';
import { toast } from 'sonner';

export const syncService = {
  isSyncing: false,

  async sync() {
    if (this.isSyncing) return;

    // Check network connectivity first
    const isOnline = await checkNetworkStatus();
    if (!isOnline) return;

    this.isSyncing = true;
    const supabase = createClient();

    try {
      // Get all queue items sorted by ID (chronological)
      const queueItems = await db.queue.orderBy('id').toArray();
      if (queueItems.length === 0) {
        this.isSyncing = false;
        return;
      }

      console.log(`[SyncService] Starting sync of ${queueItems.length} items...`);
      toast.info(`جاري مزامنة ${queueItems.length} عمليات معلقة...`);

      let processedCount = 0;
      let errorCount = 0;

      for (const item of queueItems) {
        // Double check internet before processing each item
        const stillOnline = await checkNetworkStatus();
        if (!stillOnline) {
          console.warn('[SyncService] Network lost during sync, aborting remaining queue.');
          toast.warning('انقطع الاتصال أثناء المزامنة، سيتم الاستكمال لاحقاً.');
          break;
        }

        try {
          await this.syncItem(supabase, item);
          await db.queue.delete(item.id!);
          processedCount++;
        } catch (error: any) {
          // Check if it is a network error
          if (this.isNetworkError(error)) {
            console.warn('[SyncService] Network error during item sync, aborting queue.', error);
            toast.error('خطأ في الاتصال بالشبكة أثناء المزامنة.');
            break;
          }

          // Otherwise, it's a validation, auth, or constraint error.
          // We remove it from the active queue to avoid blocking future operations.
          console.error(
            `[SyncService] Failed to sync item ${item.id} (Table: ${item.table}, Action: ${item.action}):`,
            error
          );
          await db.queue.delete(item.id!);
          errorCount++;
        }
      }

      if (processedCount > 0) {
        toast.success(`تمت مزامنة ${processedCount} عمليات بنجاح.`);
      }
      if (errorCount > 0) {
        toast.error(`فشلت مزامنة ${errorCount} عمليات بسبب أخطاء في البيانات.`);
      }
    } catch (err) {
      console.error('[SyncService] Critical error in sync process:', err);
    } finally {
      this.isSyncing = false;
    }
  },

  async syncItem(supabase: any, item: SyncQueueItem) {
    const { table, action, targetId, payload } = item;

    switch (action) {
      case 'create': {
        const { error } = await supabase
          .from(table)
          .insert([payload]);
        if (error) throw error;
        break;
      }
      case 'update': {
        const { error } = await supabase
          .from(table)
          .update(payload)
          .eq('id', targetId);
        if (error) throw error;
        break;
      }
      case 'delete': {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('id', targetId);
        if (error) throw error;
        break;
      }
      default:
        throw new Error(`Unknown sync action: ${action}`);
    }
  },

  isNetworkError(error: any): boolean {
    if (!error) return false;
    const message = error.message || '';
    return (
      message.includes('Failed to fetch') ||
      message.includes('NetworkError') ||
      message.includes('network error') ||
      error.status === 0 ||
      error.code === 'TypeError'
    );
  }
};
