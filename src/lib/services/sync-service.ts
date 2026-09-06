import { db, SyncQueueItem } from '../db/offline-db';
import { createClient } from '../supabase/client';
import { checkNetworkStatus } from '../utils/network';
import { markOnlineSync } from '../utils/offline-window';
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
      // Get all queue items sorted by ID (chronological), skipping failed rows
      const allItems = await db.queue.orderBy('id').toArray();
      const queueItems = allItems.filter(
        (item) => (item.status ?? 'pending') === 'pending'
      );
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

          // Non-network error (validation/RLS/constraint): لا نحذف العنصر أبداً —
          // نعلّمه failed للمراجعة، فلا تُفقد بيانات صامتة، ولا يحجب بقية الصفوف.
          const message = error?.message || String(error);
          console.error(
            `[SyncService] Failed to sync item ${item.id} (Table: ${item.table}, Action: ${item.action}). Marked failed for review:`,
            error
          );
          await db.queue.update(item.id!, {
            status: 'failed',
            errorCount: (item.errorCount ?? 0) + 1,
            lastError: message,
            updatedAt: Date.now(),
          });
          errorCount++;
        }
      }

      if (processedCount > 0) {
        markOnlineSync();
        toast.success(`تمت مزامنة ${processedCount} عمليات بنجاح.`);
      }
      if (errorCount > 0) {
        toast.error(`فشلت مزامنة ${errorCount} عمليات بسبب أخطاء في البيانات — حُفظت للمراجعة.`);
      }
    } catch (err) {
      console.error('[SyncService] Critical error in sync process:', err);
    } finally {
      this.isSyncing = false;
    }
  },

  /** يعيد الصفوف الفاشلة إلى قائمة الانتظار لمحاولة التزامن مجدداً. */
  async retryFailed() {
    const failed = await db.queue
      .filter((item) => item.status === 'failed')
      .toArray();
    if (failed.length === 0) return;

    await db.queue.bulkUpdate(
      failed.map((item) => ({
        key: item.id!,
        changes: { status: 'pending' as const, updatedAt: Date.now() },
      }))
    );
    toast.info(`أُعيدت ${failed.length} عمليات إلى قائمة الانتظار.`);
    await this.sync();
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
