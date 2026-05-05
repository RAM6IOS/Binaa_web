"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Mail, Lock, Chrome, Eye, EyeOff } from "lucide-react";
import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';

export function LoginForm() {
  const t = useTranslations('Auth.Login');
  const tc = useTranslations('Common');
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        router.push('/projects');
      }
    });

    const resetSuccess = window.location.search.includes('reset=success');
    if (resetSuccess) {
      toast.success(t('messages.resetSuccess'));
    }
  }, [supabase, router, t]);


  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast.error(t('validation.passwordRequired'));
      return;
    }
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(t('messages.error'), {
        description: error.message
      });
    } else {
      toast.success(t('messages.success'));
      router.push('/projects');
    }
    setLoading(false);
  };


  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) toast.error(tc('error'), { description: error.message });
  };

  const handleMagicLink = async () => {
    if (!email) {
      toast.error(t('magicLink.emailRequired'));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      toast.error(t('magicLink.error'), { description: error.message });
    } else {
      toast.success(t('magicLink.success'));
    }
    setLoading(false);
  };

  return (
    <AuthLayout
      title={t('title')}
      description={t('description')}
    >
      <div className="space-y-6">
        <form onSubmit={handlePasswordLogin} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400 rtl:left-auto rtl:right-3" />
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onInvalid={(e) => {
                  if (e.currentTarget.validity.valueMissing) {
                    e.currentTarget.setCustomValidity(tc('validation.emailRequired'));
                  } else if (e.currentTarget.validity.typeMismatch) {
                    e.currentTarget.setCustomValidity(tc('validation.emailInvalid'));
                  }
                }}
                onInput={(e) => e.currentTarget.setCustomValidity("")}
                required
                className="pl-10 rtl:pl-3 rtl:pr-10 h-11"
              />
            </div>
          </div>


          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t('password')}</Label>
              <Link href="/auth/forgot-password" title={t('forgotPassword')} className="text-xs text-blue-600 hover:underline">
                {t('forgotPassword')}
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 rtl:left-auto rtl:right-3" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onInvalid={(e) => {
                  if (e.currentTarget.validity.valueMissing) {
                    e.currentTarget.setCustomValidity(tc('validation.passwordRequired'));
                  }
                }}
                onInput={(e) => e.currentTarget.setCustomValidity("")}
                required
                className="pl-10 rtl:pl-3 rtl:pr-10 h-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 rtl:right-auto rtl:left-3"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>


          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-11 text-base shadow-lg shadow-blue-200 dark:shadow-none" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t('submit')}
          </Button>


        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-slate-950 px-2 text-slate-500">
              {tc('or')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <Button variant="outline" type="button" className="w-full h-11 border-slate-200" onClick={handleGoogleLogin}>
            <Chrome className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
            {t('google')}
          </Button>
        </div>


        <p className="text-center text-sm text-slate-600 dark:text-slate-400 pt-4">
          {t('noAccount')}{" "}
          <Link href="/auth/register" className="text-blue-600 hover:underline font-semibold">
            {t('registerNow')}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
