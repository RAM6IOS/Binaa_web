"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";
import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';

export function ForgotPasswordForm() {
  const t = useTranslations('Auth.ForgotPassword');
  const tc = useTranslations('Common');
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: undefined,
    });

    if (error) {
      toast.error(t('messages.error'), {
        description: error.message
      });
    } else {
      toast.success(t('messages.success'));
      router.push(`/auth/verify-otp?email=${encodeURIComponent(email)}`);
    }
    setLoading(false);
  };

  return (
    <AuthLayout 
      title={t('title')} 
      description={t('description')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
              className="pl-10 rtl:pl-3 rtl:pr-10"
            />
          </div>
        </div>
        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {t('submit')}
        </Button>
        
        <div className="text-center pt-2">
          <p className="text-sm text-slate-600">
            <Link 
              href="/auth/login" 
              className="text-blue-600 hover:underline font-medium transition-colors"
            >
              {t('backToLogin')}
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}

