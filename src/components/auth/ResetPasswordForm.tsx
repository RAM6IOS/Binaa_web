"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Lock, Check, X, Eye, EyeOff } from "lucide-react";
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';

export function ResetPasswordForm() {
  const t = useTranslations('Auth.ResetPassword');
  const tc = useTranslations('Common');
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [strength, setStrength] = useState({
    length: false,
    number: false,
    special: false,
    uppercase: false,
  });

  useEffect(() => {
    setStrength({
      length: password.length >= 8,
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*]/.test(password),
      uppercase: /[A-Z]/.test(password),
    });
  }, [password]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast.error(t('messages.verifyFirst'));
        router.push('/auth/forgot-password');
      }
    });
  }, [supabase, router, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error(t('messages.mismatch'));
      return;
    }

    if (!strength.length || !strength.number) {
      toast.error(t('messages.requirementsNotMet'));
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      toast.error(t('messages.error'), {
        description: error.message
      });
    } else {
      toast.success(t('messages.success'));
      router.push('/auth/login?reset=success');
    }
    setLoading(false);
  };

  const StrengthItem = ({ met, text }: { met: boolean; text: string }) => (
    <div className={`flex items-center gap-2 text-xs ${met ? "text-green-600" : "text-slate-400"}`}>
      {met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      <span>{text}</span>
    </div>
  );

  return (
    <AuthLayout
      title={t('title')}
      description={t('description')}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="password">{t('newPassword')}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 rtl:left-auto rtl:right-3" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                e.currentTarget.setCustomValidity("");
              }}
              onInvalid={(e) => {
                if (e.currentTarget.validity.valueMissing) {
                  e.currentTarget.setCustomValidity(tc('validation.passwordRequired'));
                }
              }}
              required
              className="pl-10 pr-10 rtl:pl-10 rtl:pr-10"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 rtl:right-auto rtl:left-3 focus:outline-none"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
            <StrengthItem met={strength.length} text={t('strength.length')} />
            <StrengthItem met={strength.number} text={t('strength.number')} />
            <StrengthItem met={strength.special} text={t('strength.special')} />
            <StrengthItem met={strength.uppercase} text={t('strength.uppercase')} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">{t('confirmPassword')}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 rtl:left-auto rtl:right-3" />
            <Input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                e.currentTarget.setCustomValidity("");
              }}
              onInvalid={(e) => {
                if (e.currentTarget.validity.valueMissing) {
                  e.currentTarget.setCustomValidity(tc('validation.passwordRequired'));
                }
              }}
              required
              className="pl-10 pr-10 rtl:pl-10 rtl:pr-10"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 rtl:right-auto rtl:left-3 focus:outline-none"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-11" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {t('submit')}
        </Button>
      </form>
    </AuthLayout>
  );
}