"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthNavbar } from "@/components/layout/AuthNavbar";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useTranslations } from 'next-intl';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  description: string;
}

export function AuthLayout({ children, title, description }: AuthLayoutProps) {
  const t = useTranslations('Common');

  return (
    <div className="min-h-screen flex flex-col bg-muted/40 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-0 right-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[5%] left-[-5%] w-[30%] h-[30%] bg-success/10 rounded-full blur-3xl" />
      </div>

      <AuthNavbar />

      <main className="flex-1 flex flex-col items-center justify-center p-4 pt-32 pb-12 relative z-10">
        <div className="animate-fade-in flex flex-col items-center gap-2 mb-8">
          <BrandLogo size={72} />
        </div>
        
        <div className="animate-scale-in w-full max-w-md">
          <Card className="bg-card/80 backdrop-blur-sm border-border">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-foreground">{title}</CardTitle>
              <CardDescription>
                {description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {children}
            </CardContent>
          </Card>
        </div>
        
        <p className="animate-fade-in mt-8 text-sm text-muted-foreground">
          © {new Date().getFullYear()} Binaa. {t('copyright')}
        </p>
      </main>
    </div>
  );
}
