"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';

function VerifyOtpContent() {
  const t = useTranslations('Auth.VerifyOtp');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const email = searchParams.get("email") || "";

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handlePaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim().replace(/[^0-9]/g, "");
    if (!pastedData) return;

    const otpDigits = pastedData.split("");
    const newOtp = [...otp];
    
    // If the pasted data is 8 digits, always paste starting from the first input
    const startIndex = otpDigits.length === 8 ? 0 : index;

    otpDigits.forEach((char, i) => {
      if (startIndex + i < 8) newOtp[startIndex + i] = char;
    });
    setOtp(newOtp);

    // Focus on the input after the last pasted digit or the last input
    const nextIndex = Math.min(startIndex + otpDigits.length, 7);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleChange = (index: number, value: string) => {
    const cleanValue = value.replace(/[^0-9]/g, "");
    
    if (cleanValue.length > 1) {
      const oldDigit = otp[index];
      let newDigit = cleanValue;
      if (oldDigit && cleanValue.startsWith(oldDigit)) {
        newDigit = cleanValue.substring(oldDigit.length);
      } else if (oldDigit && cleanValue.endsWith(oldDigit)) {
        newDigit = cleanValue.substring(0, cleanValue.length - oldDigit.length);
      }
      
      if (newDigit.length === 1) {
        const newOtp = [...otp];
        newOtp[index] = newDigit;
        setOtp(newOtp);
        if (index < 7) {
          inputRefs.current[index + 1]?.focus();
        }
        return;
      }

      // If it is indeed a multi-digit paste fallback
      const pastedData = cleanValue.slice(0, 8).split("");
      const newOtp = [...otp];
      pastedData.forEach((char, i) => {
        if (index + i < 8) newOtp[index + i] = char;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + pastedData.length, 7);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleanValue;
    setOtp(newOtp);

    if (cleanValue !== "" && index < 7) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (otp[index] === "" && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 7) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    
    setResending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: undefined
    });
    
    if (error) {
      toast.error(t('messages.resendError'), {
        description: error.message
      });
    } else {
      toast.success(t('messages.resendSuccess'));
      setCountdown(60);
      setOtp(["", "", "", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
    setResending(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join("");
    
    if (otpCode.length !== 8) {
      toast.error(t('validation.digitsRequired'));
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      email: email,
      token: otpCode,
      type: 'recovery'
    });

    if (error) {
      toast.error(t('messages.error'), {
        description: error.message
      });
    } else {
      toast.success(t('messages.success'));
      router.push('/auth/reset-password');
    }
    setLoading(false);
  };

  return (
    <AuthLayout 
      title={t('title')} 
      description={t('description')}
    >
      <div className="mb-6 text-center">
        <p className="text-sm font-medium text-slate-500 mb-1">{t('email')}</p>
        <p className="text-sm font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 py-1 px-3 rounded-md inline-block">
          {email}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-between gap-1.5 dir-ltr" dir="ltr">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={(e) => handlePaste(index, e)}
              className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold border-2 rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              autoFocus={index === 0}
            />
          ))}
        </div>

        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-11" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {t('submit')}
        </Button>
        
        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={handleResend}
            disabled={countdown > 0 || resending}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:text-slate-400 flex items-center gap-2 transition-colors"
          >
            {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className={`h-4 w-4 ${countdown === 0 ? "animate-none" : ""}`} />}
            {countdown > 0 
              ? t('resendWait', { seconds: countdown })
              : t('resend')
            }
          </button>

          <Link 
            href="/auth/forgot-password" 
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 inline-flex items-center gap-1 transition-colors"
          >
            {t('changeEmail')}
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

export function VerifyOtpForm() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>}>
      <VerifyOtpContent />
    </Suspense>
  );
}

