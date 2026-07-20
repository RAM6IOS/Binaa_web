"use client";

import { Building2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthNavbar } from "@/components/layout/AuthNavbar";
import { useTranslations } from 'next-intl';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  description: string;
}

export function AuthLayout({ children, title, description }: AuthLayoutProps) {
  const t = useTranslations('Common');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-0 right-0 -z-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-[120px] dark:bg-blue-900/20" />
        <div className="absolute bottom-[5%] left-[-5%] w-[30%] h-[30%] bg-green-100/50 rounded-full blur-[100px] dark:bg-green-900/20" />
      </div>

      <AuthNavbar />

      <main className="flex-1 flex flex-col items-center justify-center p-4 pt-32 pb-12 relative z-10">
        <div className="animate-fade-in flex flex-col items-center gap-2 mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30">
            <Building2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Binaa<span className="text-blue-600">.</span>
          </h1>
        </div>
        
        <div className="animate-scale-in w-full max-w-md">
          <Card className="border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-200/60 dark:shadow-none bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">{title}</CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                {description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {children}
            </CardContent>
          </Card>
        </div>
        
        <p className="animate-fade-in mt-8 text-sm text-slate-500 dark:text-slate-400">
          © {new Date().getFullYear()} Binaa. {t('copyright')}
        </p>
      </main>
    </div>
  );
}
