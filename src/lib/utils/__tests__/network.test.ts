import { describe, expect, it } from "vitest";
import { isAuthLockTimeout, isNetworkError } from "../network";

/**
 * انحدار: تعارض قفل Supabase كان يُصنَّف «انقطاع شبكة» فيُخفى بعده
 * خطأ المصادقة خلف بيانات الكاش القديمة، ويظهر للمستخدم شريط «أنت غير
 * متصل» بينما الشبكة سليمة. auth-js يضع isAcquireTimeout على أخطاء القفل.
 */
describe("isAuthLockTimeout", () => {
  it("يتعرّف على خطأ مهلة قفل Navigator LockManager", () => {
    const error = Object.assign(new Error('Lock "lock:sb-x-auth-token" was not released'), {
      isAcquireTimeout: true,
    });
    expect(isAuthLockTimeout(error)).toBe(true);
  });

  it("يتعرّف على خطأ مهلة قفل العملية", () => {
    const error = Object.assign(new Error("Acquiring process lock timed out"), {
      isAcquireTimeout: true,
    });
    expect(isAuthLockTimeout(error)).toBe(true);
  });

  it("يتجاهل الأخطاء الأخرى", () => {
    expect(isAuthLockTimeout(new Error("boom"))).toBe(false);
    expect(isAuthLockTimeout({ isAcquireTimeout: false })).toBe(false);
    expect(isAuthLockTimeout(null)).toBe(false);
    expect(isAuthLockTimeout(undefined)).toBe(false);
  });
});

describe("isNetworkError", () => {
  it("لا يعدّ تعارض القفل خطأ شبكة", () => {
    const lockTimeout = Object.assign(new Error("Lock timed out"), {
      isAcquireTimeout: true,
    });
    expect(isNetworkError(lockTimeout)).toBe(false);
  });

  it("لا يعدّ AbortError البسيط خطأ شبكة", () => {
    // الإجهاض يعني أن المتصفح ألغى الطلب (إلغاء مقصود أو تفكيك مكوّن)،
    // وهو لا يثبت انقطاع الشبكة. 네트워크 يُستدل عليها بـ checkNetworkStatus.
    expect(isNetworkError({ name: "AbortError" })).toBe(false);
  });

  it("يعدّ انقطاع الشبكة الحقيقي خطأ شبكة", () => {
    expect(isNetworkError(new TypeError("Failed to fetch"))).toBe(true);
    expect(isNetworkError(new Error("NetworkError when attempting to fetch"))).toBe(true);
    expect(isNetworkError(new Error("load failed"))).toBe(true);
    expect(isNetworkError({ code: "ERR_NETWORK" })).toBe(true);
    expect(isNetworkError({ status: 0 })).toBe(true);
  });

  it("لا يعدّ أخطاء التطبيق أخطاء شبكة", () => {
    expect(isNetworkError(new Error("JWT expired"))).toBe(false);
    expect(isNetworkError({ code: "42501", message: "new row violates row-level security policy" })).toBe(false);
    expect(isNetworkError({ status: 406, message: "not found" })).toBe(false);
    expect(isNetworkError(null)).toBe(false);
  });
});
