"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';

interface LogoutButtonProps {
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  showText?: boolean;
}

export function LogoutButton({ 
  className, 
  variant = "ghost", 
  showText = true 
}: LogoutButtonProps) {
  const t = useTranslations('Auth.Logout');
  const tc = useTranslations('Common');
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const isAr = locale === 'ar';

  const handleLogout = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;

      toast.success(t('messages.success'));
      
      // Redirect to landing page
      router.push('/');
      router.refresh(); // Refresh to ensure middleware catches the state change
    } catch (error: any) {
      toast.error(tc('error'), {
        description: error.message || tc('error')
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant={variant} 
      onClick={handleLogout} 
      disabled={loading}
      className={className}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <LogOut className={`w-4 h-4 ${showText ? (isAr ? 'ml-2' : 'mr-2') : ''}`} />
      )}
      {showText && t('button')}
    </Button>
  );
}

