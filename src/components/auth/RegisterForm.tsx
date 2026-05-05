"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Mail, User, Phone, Building, Briefcase, Eye, EyeOff, Lock } from "lucide-react";
import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';

export function RegisterForm() {
  const t = useTranslations('Auth.Register');
  const tc = useTranslations('Common');
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    company_name: "",
    job_title: "",
    password: "",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        router.push('/projects');
      }
    });
  }, [supabase, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
    e.currentTarget.setCustomValidity("");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.full_name,
          phone: formData.phone,
          job_title: formData.job_title,
          company_name: formData.company_name
        }
      }
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

  return (
    <AuthLayout
      title={t('title')}
      description={t('description')}
    >
      <form onSubmit={handleRegister} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">{t('fullName')}</Label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-slate-400 rtl:left-auto rtl:right-3" />
            <Input
              id="full_name"
              placeholder={t('fullName')}
              value={formData.full_name}
              onChange={handleChange}
              onInvalid={(e) => {
                if (e.currentTarget.validity.valueMissing) {
                  e.currentTarget.setCustomValidity(tc('validation.fieldRequired'));
                }
              }}
              required
              className="pl-10 rtl:pl-3 rtl:pr-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400 rtl:left-auto rtl:right-3" />
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={formData.email}
                onChange={handleChange}
                onInvalid={(e) => {
                  if (e.currentTarget.validity.valueMissing) {
                    e.currentTarget.setCustomValidity(tc('validation.emailRequired'));
                  } else if (e.currentTarget.validity.typeMismatch) {
                    e.currentTarget.setCustomValidity(tc('validation.emailInvalid'));
                  }
                }}
                required
                className="pl-10 rtl:pl-3 rtl:pr-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t('phone')}</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400 rtl:left-auto rtl:right-3" />
              <Input
                id="phone"
                type="tel"
                placeholder="+213..."
                value={formData.phone}
                onChange={handleChange}
                className="pl-10 rtl:pl-3 rtl:pr-10"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company_name">{t('companyName')}</Label>
            <div className="relative">
              <Building className="absolute left-3 top-3 h-4 w-4 text-slate-400 rtl:left-auto rtl:right-3" />
              <Input
                id="company_name"
                placeholder={t('companyName')}
                value={formData.company_name}
                onChange={handleChange}
                className="pl-10 rtl:pl-3 rtl:pr-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="job_title">{t('jobTitle')}</Label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-3 h-4 w-4 text-slate-400 rtl:left-auto rtl:right-3" />
              <Input
                id="job_title"
                placeholder={t('jobTitle')}
                value={formData.job_title}
                onChange={handleChange}
                className="pl-10 rtl:pl-3 rtl:pr-10"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t('password')}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 rtl:left-auto rtl:right-3" />
            <Input
              id="password"
              value={formData.password}
              onChange={handleChange}
              type={showPassword ? "text" : "password"}
              className="pl-10 pr-10 rtl:pl-10 rtl:pr-10"
              onInvalid={(e) => {
                if (e.currentTarget.validity.valueMissing) {
                  e.currentTarget.setCustomValidity(tc('validation.passwordRequired'));
                }
              }}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 rtl:right-auto rtl:left-3"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 mt-4" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {t('submit')}
        </Button>

        <p className="text-center text-sm text-slate-600 dark:text-slate-400 pt-4">
          {t('haveAccount')}{" "}
          <Link href="/auth/login" className="text-blue-600 hover:underline font-semibold">
            {t('loginNow')}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
