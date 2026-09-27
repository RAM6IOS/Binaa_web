import { isAuthLockTimeout } from './network';

/**
 * إعادة محاولة واحدة عند تعارض قفل Supabase.
 *
 * القفل `lock:sb-<ref>-auth-token` يحيط بكل عملية مصادقة. عندما تتنافس عدة
 * عمليات (عدة تبويبات، أو استعلامات متزامنة على نفس المكوّن) تنتهي إحدى
 *العمليات بانتهاء مهلة القفل رغم أن الشبكة سليمة والبيانات صحيحة.
 *
 * خصائص القفل تجعل المحاولة الثانية تنجح في الغالب: المكتبة نفسها تستعيد
 * القفل بالاستيلاء عليه بعد المهلة. لذلك نحاول مرة واحدة فقط وننشر الخطأ
 * إن تكرر، بدل إخفاء البيانات خلف الكاش.
 */
export async function retryOnceOnAuthLock<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isAuthLockTimeout(error)) throw error;

    console.warn('[AuthLock] تعارض قفل المصادقة، إعادة محاولة واحدة:', error);
    await new Promise((resolve) => setTimeout(resolve, 250));
    return operation();
  }
}
